<?php

namespace App\Controller\Relation;

use App\Entity\Identity\ApprovalRequest;
use App\Entity\Identity\Profile;
use App\Entity\Relation\Follow;
use App\Entity\Relation\Friendship;
use App\Enum\Identity\ApprovalStatus;
use App\Enum\Identity\ApprovalSubjectType;
use App\Enum\Identity\Permission;
use App\Enum\Identity\PermissionMode;
use App\Enum\Notification\NotificationType;
use App\Enum\Relation\FriendshipStatus;
use App\Security\CurrentProfile;
use App\Security\PermissionResolver;
use App\Service\Notification\Notifier;
use App\Service\Relation\RelationState;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Uid\Uuid;

/**
 * Amis et abonnements du profil actif (maquette « Amis », « Abonnés »).
 *
 * Amis (réciproque, avec demande) :
 *  - GET    /api/people/search?q= : trouver quelqu'un (identifiant ou nom affiché) ;
 *  - GET    /api/friends : mes amis ;
 *  - GET    /api/friends/requests : demandes reçues et envoyées, en attente ;
 *  - POST   /api/friends/requests {profile} : demander. Si l'autre m'avait
 *    déjà demandé, c'est accepté. Un profil enfant dont FRIEND_ADD attend
 *    l'accord du tuteur crée d'abord une ApprovalRequest : la demande n'est
 *    présentée à l'autre qu'après accord (ApprovalController) ;
 *  - POST   /api/friends/requests/{id}/accept · /decline : le destinataire,
 *    ou son tuteur pour un profil enfant ;
 *  - DELETE /api/friends/requests/{id} : retirer sa demande ;
 *  - DELETE /api/friends/{profileId} : ne plus être amis.
 *
 * Abonnements (à sens unique, sans demande) :
 *  - GET    /api/follows : mes abonnements et mes abonnés ;
 *  - POST   /api/follows {profile} : s'abonner (permission FOLLOW) ;
 *  - DELETE /api/follows/{profileId} : se désabonner.
 *
 * Chaque événement notifie l'autre (FRIEND_REQUEST, FRIEND_ACCEPTED,
 * FOLLOW_NEW, FOLLOW_MUTUAL), et le tuteur quand un enfant est concerné.
 * Les notifications partent aussi en push (PushOnNotificationSubscriber).
 */
final class RelationController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CurrentProfile $current,
        private readonly PermissionResolver $permissions,
        private readonly Notifier $notifier,
        private readonly RelationState $state,
    ) {
    }

    #[Route('/api/people/search', name: 'api_people_search', methods: ['GET'])]
    public function search(Request $request): JsonResponse
    {
        $me = $this->current->get();
        $q = mb_strtolower(trim((string) $request->query->get('q', '')));
        if (mb_strlen($q) < 2) {
            return $this->json(['profiles' => []]);
        }
        /** @var list<Profile> $found */
        $found = $this->em->createQueryBuilder()->select('p')->from(Profile::class, 'p')
            ->where('LOWER(p.username) LIKE :q OR LOWER(p.displayName) LIKE :q')
            ->andWhere('p.account != :account')->andWhere('p.id != :ghost')->andWhere('p.suspendedAt IS NULL')
            ->setParameter('q', '%'.addcslashes($q, '%_').'%')
            ->setParameter('account', $me->getAccount())->setParameter('ghost', Profile::GHOST_ID)
            ->orderBy('p.username', 'ASC')->setMaxResults(20)
            ->getQuery()->getResult();

        return $this->json(['profiles' => array_map(fn (Profile $p) => $this->describe($p) + ['relation' => $this->state->between($me, $p)], $found)]);
    }

    #[Route('/api/friends', name: 'api_friends', methods: ['GET'])]
    public function friends(): JsonResponse
    {
        $me = $this->current->get();
        $friends = array_map(fn (Friendship $f) => $f->getOther($me), $this->links($me, FriendshipStatus::Accepted));
        usort($friends, static fn (Profile $a, Profile $b) => strcasecmp($a->getDisplayName(), $b->getDisplayName()));

        return $this->json(['friends' => array_map($this->describe(...), $friends)]);
    }

    #[Route('/api/friends/requests', name: 'api_friend_requests', methods: ['GET'])]
    public function requests(): JsonResponse
    {
        $me = $this->current->get();
        $received = [];
        $sent = [];
        foreach ($this->links($me, FriendshipStatus::Pending) as $f) {
            if (!RelationState::presented($f)) {
                // Encore chez le tuteur : visible seulement de celui qui a demandé.
                if ($f->getRequester()->getId()->equals($me->getId())) {
                    $sent[] = $this->describeRequest($f, $me) + ['awaitingGuardian' => true];
                }
                continue;
            }
            if ($f->getAddressee()->getId()->equals($me->getId())) {
                $received[] = $this->describeRequest($f, $me);
            } else {
                $sent[] = $this->describeRequest($f, $me);
            }
        }

        return $this->json(['received' => $received, 'sent' => $sent]);
    }

    #[Route('/api/friends/requests', name: 'api_friend_request_create', methods: ['POST'])]
    public function ask(Request $request): JsonResponse
    {
        $me = $this->current->get();
        $other = $this->target($request);
        $mode = $this->permissions->resolve($me, Permission::FriendAdd);
        if (PermissionMode::Denied === $mode) {
            throw new AccessDeniedHttpException('Ton tuteur n\'autorise pas les demandes d\'ami.');
        }

        $link = $this->em->getRepository(Friendship::class)->findBetween($me, $other);
        if (null !== $link && FriendshipStatus::Accepted === $link->getStatus()) {
            throw new ConflictHttpException('Vous êtes déjà amis.');
        }
        if (null !== $link && FriendshipStatus::Pending === $link->getStatus()) {
            // L'autre m'avait déjà demandé : c'est oui.
            if ($link->getAddressee()->getId()->equals($me->getId()) && RelationState::presented($link) && PermissionMode::Allowed === $mode) {
                $this->acceptLink($link, $me);
                $this->em->flush();

                return $this->json($this->describeRequest($link, $me), Response::HTTP_OK);
            }
            throw new ConflictHttpException('Une demande est déjà en cours.');
        }

        $approval = null;
        if (PermissionMode::RequiresApproval === $mode) {
            $approval = new ApprovalRequest($me, Permission::FriendAdd, ['profile' => (string) $other->getId()], ApprovalSubjectType::Profile, $other->getId());
            $this->em->persist($approval);
        }
        if (null === $link) {
            $link = new Friendship($me, $other, $approval);
            $this->em->persist($link);
        } else {
            $link->requestAgain($me, $approval);
        }

        if (null !== $approval) {
            $this->notifier->notify($approval->getApprover(), NotificationType::ApprovalRequested, 'Demande pour '.$me->getDisplayName(), \sprintf('%s voudrait devenir ami avec %s. La demande attend ta décision.', $me->getDisplayName(), $other->getDisplayName()), ['approval' => (string) $approval->getId(), 'profile' => (string) $other->getId()], $me);
        } else {
            $this->state->notifyRequest($link);
        }
        $this->em->flush();

        return $this->json($this->describeRequest($link, $me), Response::HTTP_CREATED);
    }

    #[Route('/api/friends/requests/{id}/{decision}', name: 'api_friend_request_decide', methods: ['POST'], requirements: ['id' => Requirement::UUID, 'decision' => 'accept|decline'])]
    public function decide(string $id, string $decision): JsonResponse
    {
        $me = $this->current->get();
        $link = $this->em->find(Friendship::class, $id);
        if (null === $link || FriendshipStatus::Pending !== $link->getStatus() || !RelationState::presented($link)) {
            throw new NotFoundHttpException('Demande introuvable.');
        }
        $addressee = $link->getAddressee();
        $isGuardian = $addressee->getGuardian()?->getId()->equals($me->getId()) ?? false;
        if (!$addressee->getId()->equals($me->getId()) && !$isGuardian) {
            throw new NotFoundHttpException('Demande introuvable.');
        }
        if ('accept' === $decision && !$isGuardian && PermissionMode::Allowed !== $this->permissions->resolve($addressee, Permission::FriendAdd)) {
            throw new AccessDeniedHttpException('Ton tuteur doit accepter cette demande pour toi.');
        }

        if ('accept' === $decision) {
            $this->acceptLink($link, $addressee);
        } else {
            $link->decline();
        }
        $this->em->flush();

        return $this->json($this->describeRequest($link, $addressee));
    }

    #[Route('/api/friends/requests/{id}', name: 'api_friend_request_cancel', methods: ['DELETE'], requirements: ['id' => Requirement::UUID])]
    public function cancel(string $id): JsonResponse
    {
        $me = $this->current->get();
        $link = $this->em->find(Friendship::class, $id);
        if (null === $link || FriendshipStatus::Pending !== $link->getStatus() || !$link->getRequester()->getId()->equals($me->getId())) {
            throw new NotFoundHttpException('Demande introuvable.');
        }
        $approval = $link->getApprovalRequest();
        if (null !== $approval && ApprovalStatus::Pending === $approval->getStatus()) {
            $approval->withdraw();
        }
        $this->em->remove($link);
        $this->em->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/friends/{profileId}', name: 'api_friend_remove', methods: ['DELETE'], requirements: ['profileId' => Requirement::UUID])]
    public function unfriend(string $profileId): JsonResponse
    {
        $me = $this->current->get();
        $other = $this->em->find(Profile::class, $profileId) ?? throw new NotFoundHttpException('Profil introuvable.');
        $link = $this->em->getRepository(Friendship::class)->findBetween($me, $other);
        if (null === $link || FriendshipStatus::Accepted !== $link->getStatus()) {
            throw new NotFoundHttpException('Vous n\'êtes pas amis.');
        }
        // Silencieux : on ne prévient pas l'autre. Les partages restent ce qu'ils sont (l'amitié n'ouvre aucun accès).
        $this->em->remove($link);
        $this->em->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/follows', name: 'api_follows', methods: ['GET'])]
    public function follows(): JsonResponse
    {
        $me = $this->current->get();
        $repo = $this->em->getRepository(Follow::class);

        return $this->json([
            'following' => array_map(fn (Follow $f) => $this->describe($f->getFollowing()), $repo->findBy(['follower' => $me], ['createdAt' => 'DESC'])),
            'followers' => array_map(fn (Follow $f) => $this->describe($f->getFollower()), $repo->findBy(['following' => $me], ['createdAt' => 'DESC'])),
        ]);
    }

    #[Route('/api/follows', name: 'api_follow_create', methods: ['POST'])]
    public function follow(Request $request): JsonResponse
    {
        $me = $this->current->get();
        $other = $this->target($request);
        if (PermissionMode::Allowed !== $this->permissions->resolve($me, Permission::Follow)) {
            throw new AccessDeniedHttpException('Ton tuteur doit autoriser les abonnements.');
        }
        $repo = $this->em->getRepository(Follow::class);
        if (null !== $repo->findOneBy(['follower' => $me, 'following' => $other])) {
            return $this->json(['following' => true]);
        }
        $this->em->persist(new Follow($me, $other));

        $mutual = null !== $repo->findOneBy(['follower' => $other, 'following' => $me]);
        if ($mutual) {
            $this->notifier->notify($other, NotificationType::FollowMutual, 'Abonnement mutuel', $me->getDisplayName().' et toi vous suivez maintenant mutuellement.', ['profile' => (string) $me->getId()], $me);
        } else {
            $this->notifier->notify($other, NotificationType::FollowNew, 'Nouvel abonné', $me->getDisplayName().' s\'est abonné à toi.', ['profile' => (string) $me->getId()], $me);
        }
        $this->em->flush();

        return $this->json(['following' => true], Response::HTTP_CREATED);
    }

    #[Route('/api/follows/{profileId}', name: 'api_follow_remove', methods: ['DELETE'], requirements: ['profileId' => Requirement::UUID])]
    public function unfollow(string $profileId): JsonResponse
    {
        $me = $this->current->get();
        $follow = $this->em->getRepository(Follow::class)->findOneBy(['follower' => $me, 'following' => $profileId]);
        if (null !== $follow) {
            $this->em->remove($follow);
            $this->em->flush();
        }

        return $this->json(['following' => false]);
    }

    private function acceptLink(Friendship $link, Profile $by): void
    {
        $link->accept();
        $this->notifier->notify($link->getRequester(), NotificationType::FriendAccepted, 'Nouvel ami', $by->getDisplayName().' a accepté ta demande.', ['profile' => (string) $by->getId()], $by);
    }

    /** @return list<Friendship> */
    private function links(Profile $me, FriendshipStatus $status): array
    {
        return $this->em->createQueryBuilder()->select('f')->from(Friendship::class, 'f')
            ->where('f.requester = :me OR f.addressee = :me')->andWhere('f.status = :status')
            ->setParameter('me', $me->getId(), 'uuid')->setParameter('status', $status)
            ->orderBy('f.requestedAt', 'DESC')
            ->getQuery()->getResult();
    }

    private function target(Request $request): Profile
    {
        $id = $request->toArray()['profile'] ?? null;
        if (!\is_string($id) || !Uuid::isValid($id)) {
            throw new BadRequestHttpException('« profile » est l\'identifiant d\'un profil.');
        }
        $other = $this->em->find(Profile::class, $id);
        $me = $this->current->get();
        if (null === $other || $other->isGhost()) {
            throw new NotFoundHttpException('Profil introuvable.');
        }
        if ($other->getAccount()->getId()->equals($me->getAccount()->getId())) {
            throw new UnprocessableEntityHttpException('Les profils d\'un même compte sont déjà réunis dans le foyer.');
        }

        return $other;
    }

    /** @return array<string, mixed> */
    private function describe(Profile $p): array
    {
        return ['id' => (string) $p->getId(), 'displayName' => $p->getDisplayName(), 'username' => $p->getUsername()];
    }

    /** @return array<string, mixed> */
    private function describeRequest(Friendship $f, Profile $me): array
    {
        return [
            'id' => (string) $f->getId(),
            'status' => $f->getStatus()->value,
            'profile' => $this->describe($f->getOther($me)),
            'direction' => $f->getRequester()->getId()->equals($me->getId()) ? 'sent' : 'received',
            'requestedAt' => $f->getRequestedAt()->format(\DATE_ATOM),
        ];
    }
}
