<?php

namespace App\Service\Relation;

use App\Entity\Identity\Profile;
use App\Entity\Relation\Follow;
use App\Entity\Relation\Friendship;
use App\Enum\Identity\ApprovalStatus;
use App\Enum\Notification\NotificationType;
use App\Enum\Relation\FriendshipStatus;
use App\Service\Notification\Notifier;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Où en est le profil actif avec un autre profil : amis, demande en cours
 * (dans quel sens, en attente du tuteur ?), abonné, suivi. C'est ce que
 * les boutons de la page profil affichent.
 */
final class RelationState
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly Notifier $notifier,
    ) {
    }

    /** @return array{friend: bool, request: array{id: string, direction: string, awaitingGuardian: bool}|null, following: bool, followsMe: bool} */
    public function between(Profile $me, Profile $other): array
    {
        $link = $this->em->getRepository(Friendship::class)->findBetween($me, $other);
        $request = null;
        if (null !== $link && FriendshipStatus::Pending === $link->getStatus()) {
            $mine = $link->getRequester()->getId()->equals($me->getId());
            if ($mine || self::presented($link)) {
                $request = ['id' => (string) $link->getId(), 'direction' => $mine ? 'sent' : 'received', 'awaitingGuardian' => !self::presented($link)];
            }
        }
        $follows = $this->em->getRepository(Follow::class);

        return [
            'friend' => null !== $link && FriendshipStatus::Accepted === $link->getStatus(),
            'request' => $request,
            'following' => null !== $follows->findOneBy(['follower' => $me, 'following' => $other]),
            'followsMe' => null !== $follows->findOneBy(['follower' => $other, 'following' => $me]),
        ];
    }

    /** Une demande présentée à l'autre : sans accord parental requis, ou accord donné. */
    public static function presented(Friendship $link): bool
    {
        $approval = $link->getApprovalRequest();

        return null === $approval || ApprovalStatus::Approved === $approval->getStatus();
    }

    /** « Demande d'ami » à l'autre, et à son tuteur s'il est enfant (« Demande pour Noé »). */
    public function notifyRequest(Friendship $link): void
    {
        $from = $link->getRequester();
        $to = $link->getAddressee();
        $data = ['profile' => (string) $from->getId(), 'friendship' => (string) $link->getId()];
        $this->notifier->notify($to, NotificationType::FriendRequest, 'Demande d’ami', $from->getDisplayName().' t’a envoyé une demande d’ami.', $data, $from);
        $guardian = $to->getGuardian();
        if (null !== $guardian) {
            $this->notifier->notify($guardian, NotificationType::FriendRequest, 'Demande pour '.$to->getDisplayName(), \sprintf('%s a reçu une demande d’ami de %s. Elle attend ta décision.', $to->getDisplayName(), $from->getDisplayName()), $data, $from);
        }
    }
}
