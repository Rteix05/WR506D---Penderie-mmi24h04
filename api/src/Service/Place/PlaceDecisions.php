<?php

namespace App\Service\Place;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Place\Place;
use App\Entity\Place\PlaceDecision;
use App\Entity\Place\Room;
use App\Enum\Place\PlaceDecisionKind;
use App\Enum\Place\PlaceDecisionStatus;
use App\Repository\Relation\FriendshipRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Les décisions communes d'une colocation (unanimité, décision du 30/09) :
 * les ouvrir, les voter, et les APPLIQUER quand le dernier « oui » arrive,
 * dans la même transaction.
 */
final class PlaceDecisions
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly FriendshipRepository $friendships,
    ) {
    }

    /** Inviter un ami dans le logement : tous les membres, et lui, doivent accepter. */
    public function invite(Place $place, Profile $by, Profile $invitee): PlaceDecision
    {
        if (!$this->friendships->areFriends($by, $invitee)) {
            throw new \LogicException('On invite en colocation un de ses amis.');
        }
        $this->assertNoPending($place, PlaceDecisionKind::InviteMember, $invitee, null);

        return $this->open(PlaceDecision::inviteMember($place, $by, $invitee));
    }

    /** Supprimer le logement : seul, directement (DELETE) ; en colocation, par l'accord de tous. */
    public function deletePlace(Place $place, Profile $by): PlaceDecision
    {
        $this->assertEmpty($place->getRooms()->toArray(), 'Le logement');
        $this->assertNoPending($place, PlaceDecisionKind::DeletePlace, null, null);

        return $this->open(PlaceDecision::deletePlace($place, $by));
    }

    /** Supprimer une pièce commune : par l'accord de tous, et seulement vide. */
    public function deleteRoom(Room $room, Profile $by): PlaceDecision
    {
        $this->assertEmpty([$room], 'La pièce');
        $this->assertNoPending($room->getPlace(), PlaceDecisionKind::DeleteRoom, null, $room);

        return $this->open(PlaceDecision::deleteRoom($room, $by));
    }

    /** Sans vote (seul dans son logement, ou sa pièce fermée) : supprimé tout de suite, s'il est vide. */
    public function removeNow(Place|Room $target): void
    {
        $this->remove($target, $target instanceof Place ? $target->getRooms()->toArray() : [$target]);
        $this->em->flush();
    }

    public function vote(PlaceDecision $decision, Profile $voter, bool $approve): void
    {
        // Le vote (et ses règles) d'abord, hors transaction : une exception dedans fermerait l'EntityManager.
        $approved = $decision->vote($voter, $approve);
        if ($approved) {
            $this->assertApplicable($decision);
        }
        $this->em->wrapInTransaction(function () use ($decision, $approved): void {
            if ($approved) {
                $this->apply($decision);
            }
            $this->em->flush();
        });
    }

    /** Après un départ : les décisions en attente se recomptent (celui qui part ne bloque plus). */
    public function settleAfterDeparture(Place $place, Profile $leaver): void
    {
        foreach ($this->pending($place) as $decision) {
            if ($decision->getRequestedBy()->getId()->equals($leaver->getId())) {
                $decision->drop();
            } elseif ($decision->settle()) {
                $this->apply($decision);
            }
        }
    }

    /** @return list<PlaceDecision> */
    public function pending(Place $place): array
    {
        return $this->em->getRepository(PlaceDecision::class)->findBy(['place' => $place, 'status' => PlaceDecisionStatus::Pending]);
    }

    private function open(PlaceDecision $decision): PlaceDecision
    {
        $this->em->persist($decision);
        // Seul membre (supprimer son propre logement, sa pièce) : son « oui » suffit.
        if ($decision->settle()) {
            $this->apply($decision);
        }
        $this->em->flush();

        return $decision;
    }

    private function assertApplicable(PlaceDecision $decision): void
    {
        match ($decision->getKind()) {
            PlaceDecisionKind::DeletePlace => $this->assertEmpty($decision->getPlace()->getRooms()->toArray(), 'Le logement'),
            PlaceDecisionKind::DeleteRoom => $this->assertEmpty([$decision->getRoom()], 'La pièce'),
            PlaceDecisionKind::InviteMember => null,
        };
    }

    private function apply(PlaceDecision $decision): void
    {
        match ($decision->getKind()) {
            PlaceDecisionKind::InviteMember => $decision->getPlace()->addMember($decision->getInvitee()),
            PlaceDecisionKind::DeletePlace => $this->remove($decision->getPlace(), $decision->getPlace()->getRooms()->toArray()),
            PlaceDecisionKind::DeleteRoom => $this->remove($decision->getRoom(), [$decision->getRoom()]),
        };
    }

    /** @param list<Room> $rooms */
    private function remove(object $target, array $rooms): void
    {
        // Vérifié à nouveau : quelqu'un a pu ranger quelque chose pendant le vote.
        $this->assertEmpty($rooms, $target instanceof Place ? 'Le logement' : 'La pièce');
        $this->em->remove($target);
    }

    /** @param list<Room> $rooms */
    private function assertEmpty(array $rooms, string $what): void
    {
        if ([] === $rooms) {
            return;
        }
        foreach ([Item::class, Garment::class] as $class) {
            $count = (int) $this->em->createQueryBuilder()->select('COUNT(p.id)')->from($class, 'p')
                ->where('p.room IN (:rooms)')->setParameter('rooms', array_map(static fn (Room $r) => $r->getId()->toRfc4122(), $rooms))
                ->getQuery()->getSingleScalarResult();
            if ($count > 0) {
                throw new ContainsPossessions(\sprintf('%s contient encore des affaires : chacun reprend les siennes avant.', $what));
            }
        }
    }

    private function assertNoPending(Place $place, PlaceDecisionKind $kind, ?Profile $invitee, ?Room $room): void
    {
        foreach ($this->pending($place) as $decision) {
            if ($decision->getKind() === $kind
                && $decision->getInvitee()?->getId()?->toRfc4122() === $invitee?->getId()->toRfc4122()
                && $decision->getRoom()?->getId()?->toRfc4122() === $room?->getId()->toRfc4122()) {
                throw new \LogicException('Cette décision est déjà en attente de votes.');
            }
        }
    }
}
