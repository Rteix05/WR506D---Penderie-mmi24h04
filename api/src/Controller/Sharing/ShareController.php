<?php

namespace App\Controller\Sharing;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\AbstractPossession;
use App\Entity\Relation\Follow;
use App\Entity\Sharing\Share;
use App\Entity\Sharing\ShareRecipient;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use App\Repository\Relation\FriendshipRepository;
use App\Security\CurrentProfile;
use App\Security\ResourceAccess;
use App\Service\Sharing\ShareTargets;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

/**
 * Partager, repartager, révoquer ; voir ses partages et ce qu'on m'a
 * partagé. Toutes les règles (EDIT réservé aux personnes nommées,
 * repartage en lecture seule, objet personnel…) vivent dans les entités
 * et ResourceAccess ; ce contrôleur ne fait que traduire la requête.
 */
#[Route('/api/shares')]
final class ShareController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CurrentProfile $current,
        private readonly ResourceAccess $access,
        private readonly ShareTargets $targets,
        private readonly FriendshipRepository $friendships,
    ) {
    }

    /**
     * Corps : {targetType, targetId, audience, accessLevel?, recipients?: [profileId], expiresAt?}
     * Le propriétaire partage ; une personne autorisée à modifier repartage (en lecture).
     */
    #[Route('', name: 'api_share_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $me = $this->current->get();
        $body = $request->toArray();
        $type = (string) ($body['targetType'] ?? '');
        $target = $this->targets->find($type, (string) ($body['targetId'] ?? ''));
        $audience = ShareAudience::from((string) ($body['audience'] ?? ''));
        $level = AccessLevel::from((string) ($body['accessLevel'] ?? AccessLevel::Read->value));

        $grant = null;
        if (!$this->access->isOwner($me, $target)) {
            $grant = $this->access->editGrant($me, $target)
                ?? throw new AccessDeniedException('On ne partage que ce qu\'on possède, ou ce qu\'on a le droit de modifier.');
        }

        $shareClass = $this->targets->shareClass($type);
        /** @var Share $share */
        $share = new $shareClass($me, $target, $audience, $level, $grant);
        if (isset($body['expiresAt'])) {
            $share->setExpiresAt(new \DateTimeImmutable((string) $body['expiresAt']));
        }
        $recipients = [];
        foreach ((array) ($body['recipients'] ?? []) as $profileId) {
            $profile = $this->em->find(Profile::class, (string) $profileId) ?? throw new \LogicException('Destinataire introuvable.');
            if (!$this->friendships->areFriends($me, $profile)) {
                throw new \LogicException('On ne partage nommément qu\'avec ses amis.');
            }
            $recipients[] = $share->addRecipient($profile);
        }
        if (ShareAudience::Specific === $audience && [] === $recipients) {
            throw new \LogicException('Un partage à des personnes choisies nomme au moins une personne.');
        }

        $this->em->persist($share);
        foreach ($recipients as $recipient) {
            $this->em->persist($recipient);
        }
        $this->em->flush();

        return $this->json($this->describe($share, true), Response::HTTP_CREATED);
    }

    /** Mes partages : ceux de mes affaires, et ceux que j'ai faits. */
    #[Route('', name: 'api_share_mine', methods: ['GET'])]
    public function mine(): JsonResponse
    {
        $me = $this->current->get();
        $shares = $this->em->createQueryBuilder()->select('s')->from(Share::class, 's')
            ->where('s.owner = :me OR s.sharedBy = :me')->setParameter('me', $me->getId(), 'uuid')
            ->orderBy('s.createdAt', 'DESC')->getQuery()->getResult();

        return $this->json(array_map(fn (Share $s) => $this->describe($s, true), $shares));
    }

    /** Ce qu'on m'a partagé et que je peux effectivement voir (amitié et abonnement vérifiés maintenant). */
    #[Route('/received', name: 'api_share_received', methods: ['GET'])]
    public function received(): JsonResponse
    {
        $me = $this->current->get();
        $candidates = [
            ...$this->em->createQueryBuilder()->select('s')->from(Share::class, 's')
                ->join(ShareRecipient::class, 'r', 'WITH', 'r.share = s')
                ->where('r.profile = :me')->setParameter('me', $me->getId(), 'uuid')->getQuery()->getResult(),
            ...$this->em->createQueryBuilder()->select('s')->from(Share::class, 's')
                ->where('s.audience IN (:open)')->andWhere('s.sharedBy != :me')->andWhere('s.revokedAt IS NULL')
                ->setParameter('open', [ShareAudience::Friends->value, ShareAudience::Followers->value])
                ->setParameter('me', $me->getId(), 'uuid')->getQuery()->getResult(),
        ];
        $visible = [];
        foreach ($candidates as $share) {
            $target = $this->targets->targetOf($share);
            $personal = $target instanceof AbstractPossession && $target->isPersonal();
            if (!$personal && $this->access->appliesTo($share, $me)) {
                $visible[(string) $share->getId()] = $this->describe($share, false);
            }
        }

        return $this->json(array_values($visible));
    }

    /** Révoquer : le propriétaire (ou son tuteur), ou celui qui a fait ce partage. */
    #[Route('/{id}', name: 'api_share_revoke', methods: ['DELETE'])]
    public function revoke(string $id): JsonResponse
    {
        $me = $this->current->get();
        $share = $this->em->find(Share::class, $id) ?? throw $this->createNotFoundException();
        $isOwner = $this->access->isOwner($me, $this->targets->targetOf($share));
        if (!$isOwner && !$share->getSharedBy()->getId()->equals($me->getId())) {
            throw new AccessDeniedException('Seuls le propriétaire et l\'auteur du partage le révoquent.');
        }
        $share->revoke();
        $this->em->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    /** @return array<string, mixed> */
    private function describe(Share $share, bool $forSharer): array
    {
        $target = $this->targets->targetOf($share);

        return array_filter([
            'id' => (string) $share->getId(),
            'targetType' => $this->targets->typeOf($share),
            'targetId' => (string) $target->getId(),
            'targetName' => method_exists($target, 'getName') ? $target->getName() : null,
            'owner' => ['id' => (string) $share->getOwner()->getId(), 'displayName' => $share->getOwner()->getDisplayName()],
            'sharedBy' => ['id' => (string) $share->getSharedBy()->getId(), 'displayName' => $share->getSharedBy()->getDisplayName()],
            'reshare' => $share->isReshare(),
            'audience' => $share->getAudience()->value,
            'accessLevel' => $share->getAccessLevel()->value,
            'active' => $share->isActive(),
            'expiresAt' => $share->getExpiresAt()?->format(\DATE_ATOM),
            // Le jeton d'un lien et la liste des destinataires ne regardent que celui qui partage.
            'token' => $forSharer ? $share->getToken() : null,
            'recipients' => $forSharer ? array_map(static fn (ShareRecipient $r) => (string) $r->getProfile()->getId(), $share->getRecipients()->toArray()) : null,
        ], static fn ($v) => null !== $v);
    }
}
