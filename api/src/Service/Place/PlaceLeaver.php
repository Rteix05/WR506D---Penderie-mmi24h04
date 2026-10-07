<?php

namespace App\Service\Place;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\AbstractPossession;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Sharing\BoxShare;
use App\Entity\Sharing\PlaceShare;
use App\Entity\Sharing\RoomShare;
use App\Entity\Sharing\Share;
use App\Entity\Sharing\StorageShare;
use App\Enum\Inventory\Availability;
use App\Enum\Inventory\MoveReason;
use App\Service\Inventory\LocationMover;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Quitter une colocation (décision du 30/09). Ses affaires rangées dans le
 * logement, au choix :
 *  - TAKE : elles partent avec soi, dans une de ses pièces ailleurs
 *    (déplacement tracé dans l'historique) ;
 *  - TRANSFER : elles sont transmises à un coloc, qui en devient
 *    propriétaire — jamais un objet personnel, ni un objet prêté ou en
 *    vente (à régler d'abord).
 *
 * Et : ses partages de ce logement sont révoqués, ses autorisations de
 * pièce retirées ; ses pièces fermées le restent, mais n'importe quel
 * membre peut désormais les rouvrir ; s'il était le référent, le plus
 * ancien membre restant le devient ; les décisions en attente se
 * recomptent sans lui.
 */
final class PlaceLeaver
{
    public const TAKE = 'TAKE';
    public const TRANSFER = 'TRANSFER';

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly PlaceDecisions $decisions,
    ) {
    }

    public function leave(Place $place, Profile $leaver, string $mode, ?Room $destination = null, ?Profile $heir = null): void
    {
        if (!$place->hasMember($leaver)) {
            throw new \LogicException('Tu ne fais pas partie de ce logement.');
        }
        if (!$place->isShared()) {
            throw new \LogicException('Dernier occupant : on supprime le logement, on ne le quitte pas.');
        }
        $possessions = $this->possessionsOf($leaver, $place);
        // Toutes les règles AVANT la transaction : une exception à l'intérieur fermerait l'EntityManager.
        match ($mode) {
            self::TAKE => $this->assertCanTake($place, $leaver, $possessions, $destination),
            self::TRANSFER => $this->assertCanTransfer($place, $leaver, $possessions, $heir),
            default => throw new \LogicException('Mode de départ inconnu : TAKE ou TRANSFER.'),
        };

        $this->em->wrapInTransaction(function () use ($place, $leaver, $mode, $destination, $heir, $possessions): void {
            $mover = new LocationMover($this->em);
            foreach ($possessions as $possession) {
                self::TAKE === $mode
                    ? $mover->move($possession, $destination, null, null, $leaver, MoveReason::ManualMove)
                    : $possession->transferTo($heir);
            }
            $this->revokeShares($place, $leaver);
            foreach ($place->getRooms() as $room) {
                foreach ($room->getAllowedMembers()->toArray() as $allowed) {
                    if ($allowed->getId()->equals($leaver->getId())) {
                        $room->getAllowedMembers()->removeElement($allowed);
                    }
                }
            }
            $place->removeMember($leaver);
            $this->decisions->settleAfterDeparture($place, $leaver);
            $this->em->flush();
        });
    }

    /** @param list<AbstractPossession> $possessions */
    private function assertCanTake(Place $place, Profile $leaver, array $possessions, ?Room $destination): void
    {
        if ([] === $possessions) {
            return;
        }
        if (null === $destination || $destination->getPlace()->getId()->equals($place->getId())
            || !$destination->getOwner()->getId()->equals($leaver->getId())) {
            throw new \LogicException('Pour reprendre tes affaires, choisis une de tes pièces, dans un autre logement.');
        }
    }

    /** @param list<AbstractPossession> $possessions */
    private function assertCanTransfer(Place $place, Profile $leaver, array $possessions, ?Profile $heir): void
    {
        if (null === $heir || $heir->getId()->equals($leaver->getId()) || !$place->hasMember($heir)) {
            throw new \LogicException('On transmet ses affaires à un autre membre du logement.');
        }
        foreach ($possessions as $possession) {
            if ($possession->isPersonal()) {
                throw new \LogicException(\sprintf('« %s » est personnel : il part avec toi (mode TAKE).', $possession->getName()));
            }
            if (Availability::Available !== $possession->getAvailability() && !$possession->isDeleted()) {
                throw new \LogicException(\sprintf('« %s » est %s : règle-le avant de le transmettre.', $possession->getName(), $possession->getAvailability()->value));
            }
        }
    }

    /** @return list<AbstractPossession> ses objets et vêtements rangés dans ce logement (supprimés en douceur compris) */
    private function possessionsOf(Profile $owner, Place $place): array
    {
        $all = [];
        foreach ([Item::class, Garment::class] as $class) {
            $all = [...$all, ...$this->em->createQueryBuilder()->select('p')->from($class, 'p')
                ->join('p.room', 'r')
                ->where('p.owner = :o')->andWhere('r.place = :pl')
                ->setParameter('o', $owner->getId(), 'uuid')->setParameter('pl', $place->getId(), 'uuid')
                ->getQuery()->getResult()];
        }

        return $all;
    }

    private function revokeShares(Place $place, Profile $leaver): void
    {
        // Pour chaque sorte de partage : le chemin de la cible jusqu'au logement.
        $paths = [
            PlaceShare::class => [],
            RoomShare::class => ['s.room' => 'r'],
            StorageShare::class => ['s.storage' => 't', 't.room' => 'r'],
            BoxShare::class => ['s.box' => 't', 't.room' => 'r'],
        ];
        foreach ($paths as $class => $joins) {
            $qb = $this->em->createQueryBuilder()->select('s')->from($class, 's');
            foreach ($joins as $relation => $alias) {
                $qb->join($relation, $alias);
            }
            /** @var list<Share> $shares */
            $shares = $qb->where([] === $joins ? 's.place = :pl' : 'r.place = :pl')
                ->andWhere('s.revokedAt IS NULL')->andWhere('s.owner = :me OR s.sharedBy = :me')
                ->setParameter('pl', $place->getId(), 'uuid')->setParameter('me', $leaver->getId(), 'uuid')
                ->getQuery()->getResult();
            foreach ($shares as $share) {
                $share->revoke();
            }
        }
    }
}
