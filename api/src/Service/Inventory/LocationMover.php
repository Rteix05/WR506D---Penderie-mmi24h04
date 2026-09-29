<?php

namespace App\Service\Inventory;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\AbstractPossession;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Inventory\LocationHistory;
use App\Entity\Place\Box;
use App\Entity\Place\Room;
use App\Entity\Place\Storage;
use App\Enum\Inventory\MoveReason;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Tous les déplacements passent par ici : c'est le seul endroit qui écrit
 * LocationHistory, et qui garde la cascade Room ▸ Storage ▸ Box cohérente
 * quand un conteneur ou un meuble bouge avec son contenu (règle du MDD :
 * « réaffectation transactionnelle de room et storage sur tout son
 * contenu »).
 *
 * Chaque méthode travaille dans une transaction et fait le flush.
 */
final class LocationMover
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    /** Ranger un objet ailleurs. Sans effet si l'emplacement ne change pas. */
    public function move(
        Item|Garment $possession,
        Room $room,
        ?Storage $storage,
        ?Box $box,
        Profile $movedBy,
        MoveReason $reason = MoveReason::ManualMove,
    ): void {
        $this->em->wrapInTransaction(function () use ($possession, $room, $storage, $box, $movedBy, $reason): void {
            $this->relocate($possession, $room, $storage, $box, $movedBy, $reason);
        });
    }

    /** Déplacer un conteneur, et tout ce qu'il contient avec lui. */
    public function moveBox(Box $box, Room $room, ?Storage $storage, Profile $movedBy): void
    {
        $this->em->wrapInTransaction(function () use ($box, $room, $storage, $movedBy): void {
            $contents = $this->contentsOf(['box' => $box]);
            $box->moveTo($room, $storage);
            foreach ($contents as $possession) {
                $this->relocate($possession, $room, $storage, $box, $movedBy, MoveReason::BoxMoved);
            }
        });
    }

    /**
     * Déplacer un meuble dans une autre pièce : ses conteneurs le suivent
     * (Storage::moveTo), et tout ce qui est rangé dessus ou dedans aussi.
     */
    public function moveStorage(Storage $storage, Room $room, Profile $movedBy): void
    {
        $this->em->wrapInTransaction(function () use ($storage, $room, $movedBy): void {
            $contents = $this->contentsOf(['storage' => $storage]);
            $storage->moveTo($room);
            foreach ($contents as $possession) {
                $this->relocate($possession, $room, $storage, $possession->getBox(), $movedBy, MoveReason::BoxMoved);
            }
        });
    }

    private function relocate(
        AbstractPossession $possession,
        Room $room,
        ?Storage $storage,
        ?Box $box,
        Profile $movedBy,
        MoveReason $reason,
    ): void {
        if (null !== $box) {
            // Le conteneur impose sa pièce et son rangement.
            $room = $box->getRoom();
            $storage = $box->getStorage();
        }
        if ($this->sameLocation($possession, $room, $storage, $box)) {
            return;
        }

        \assert($possession instanceof Item || $possession instanceof Garment);
        $this->em->persist(LocationHistory::leaving($possession, $movedBy, $reason));
        $possession->placeAt($room, $storage, $box);
    }

    /**
     * Compare l'emplacement actuel de l'objet à la destination. Lors d'un
     * déplacement en bloc, le conteneur a déjà bougé mais l'objet pas
     * encore : son historique cite donc bien l'emplacement quitté.
     */
    private function sameLocation(AbstractPossession $p, Room $room, ?Storage $storage, ?Box $box): bool
    {
        return $p->getRoom()->getId()->equals($room->getId())
            && $p->getStorage()?->getId()->toRfc4122() === $storage?->getId()->toRfc4122()
            && $p->getBox()?->getId()->toRfc4122() === $box?->getId()->toRfc4122();
    }

    /**
     * Les objets et vêtements rangés à cet endroit, supprimés compris : un
     * objet supprimé en douceur peut être restauré, il doit l'être au bon
     * endroit.
     *
     * @param array<string, Box|Storage> $criteria
     *
     * @return list<Item|Garment>
     */
    private function contentsOf(array $criteria): array
    {
        return [
            ...$this->em->getRepository(Item::class)->findBy($criteria),
            ...$this->em->getRepository(Garment::class)->findBy($criteria),
        ];
    }
}
