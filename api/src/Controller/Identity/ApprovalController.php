<?php

namespace App\Controller\Identity;

use App\Entity\Identity\ApprovalRequest;
use App\Entity\Relation\Friendship;
use App\Enum\Identity\ApprovalStatus;
use App\Enum\Identity\Permission;
use App\Enum\Notification\NotificationType;
use App\Enum\Relation\FriendshipStatus;
use App\Security\CurrentProfile;
use App\Service\Notification\Notifier;
use App\Service\Relation\RelationState;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;

/**
 * L'accord du tuteur (ApprovalRequest), exposé pour les demandes d'ami
 * d'un profil enfant dont FRIEND_ADD est « avec accord » (maquette :
 * « Demande pour Noé… Elle attend ta décision ») :
 *
 *  - GET  /api/approvals : ce qui attend ma décision ;
 *  - POST /api/approvals/{id}/approve · /reject {note?} : décider. Accordée,
 *    la demande d'ami est présentée à l'autre profil ; refusée, elle
 *    disparaît. L'enfant apprend la décision (APPROVAL_DECIDED).
 */
#[Route('/api/approvals')]
final class ApprovalController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CurrentProfile $current,
        private readonly Notifier $notifier,
        private readonly RelationState $relations,
    ) {
    }

    #[Route('', name: 'api_approvals', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $pending = $this->em->getRepository(ApprovalRequest::class)->findBy(['approver' => $this->current->get(), 'status' => ApprovalStatus::Pending], ['createdAt' => 'DESC']);

        return $this->json(['approvals' => array_map($this->describe(...), $pending)]);
    }

    #[Route('/{id}/{decision}', name: 'api_approval_decide', methods: ['POST'], requirements: ['id' => Requirement::UUID, 'decision' => 'approve|reject'])]
    public function decide(string $id, string $decision, Request $request): JsonResponse
    {
        $me = $this->current->get();
        $approval = $this->em->find(ApprovalRequest::class, $id);
        if (null === $approval || !$approval->getApprover()->getId()->equals($me->getId()) || ApprovalStatus::Pending !== $approval->getStatus()) {
            throw new NotFoundHttpException('Demande introuvable.');
        }
        $note = '' === $request->getContent() ? null : ($request->toArray()['note'] ?? null);
        $note = \is_string($note) && '' !== trim($note) ? trim($note) : null;
        $link = Permission::FriendAdd === $approval->getPermission() ? $this->em->getRepository(Friendship::class)->findOneBy(['approvalRequest' => $approval]) : null;

        if ('approve' === $decision) {
            $approval->approve($note);
            if (null !== $link && FriendshipStatus::Pending === $link->getStatus()) {
                $this->relations->notifyRequest($link);
            }
        } else {
            $approval->reject($note);
            if (null !== $link && FriendshipStatus::Pending === $link->getStatus()) {
                $this->em->remove($link);
            }
        }
        $child = $approval->getRequester();
        $this->notifier->notify($child, NotificationType::ApprovalDecided, 'approve' === $decision ? 'Demande autorisée' : 'Demande refusée', $me->getDisplayName().('approve' === $decision ? ' a autorisé ta demande d\'ami.' : ' a refusé ta demande d\'ami.').(null === $note ? '' : ' « '.$note.' »'), ['approval' => (string) $approval->getId()], $me);
        $this->em->flush();

        return $this->json($this->describe($approval));
    }

    /** @return array<string, mixed> */
    private function describe(ApprovalRequest $a): array
    {
        $target = null !== $a->getSubjectId() ? $this->em->find(\App\Entity\Identity\Profile::class, $a->getSubjectId()) : null;

        return [
            'id' => (string) $a->getId(),
            'permission' => $a->getPermission()->value,
            'status' => $a->getStatus()->value,
            'requester' => ['id' => (string) $a->getRequester()->getId(), 'displayName' => $a->getRequester()->getDisplayName()],
            'subject' => null === $target ? null : ['id' => (string) $target->getId(), 'displayName' => $target->getDisplayName(), 'username' => $target->getUsername()],
            'createdAt' => $a->getCreatedAt()?->format(\DATE_ATOM),
        ];
    }
}
