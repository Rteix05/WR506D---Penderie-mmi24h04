<?php

namespace App\Entity\Inventory;

use App\Entity\Identity\Profile;
use App\Entity\Place\Box;
use App\Entity\Place\Room;
use App\Entity\Place\Storage;
use App\Enum\Inventory\MoveReason;
use App\Repository\Inventory\LocationHistoryRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * La trace d'un déplacement : l'emplacement QUITTÉ. L'emplacement courant
 * vit sur l'objet ; cette table répond à « où était-ce avant le
 * déménagement ? ». Écrite par LocationMover, jamais modifiée.
 */
#[ORM\Entity(repositoryClass: LocationHistoryRepository::class)]
#[ORM\Index(name: 'idx_location_history_item', columns: ['item_id', 'moved_at'])]
#[ORM\Index(name: 'idx_location_history_garment', columns: ['garment_id', 'moved_at'])]
class LocationHistory
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    /** Exactement un des deux (CHECK en base). */
    #[ORM\ManyToOne(targetEntity: Item::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Item $item = null;

    #[ORM\ManyToOne(targetEntity: Garment::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Garment $garment = null;

    /**
     * CASCADE (écart assumé avec le « RESTRICT si non vide » des lieux) :
     * sinon une pièce qui a un jour contenu un objet ne pourrait plus
     * jamais être supprimée. Supprimer la pièce efface l'historique qui
     * la cite.
     */
    #[ORM\ManyToOne(targetEntity: Room::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Room $room;

    #[ORM\ManyToOne(targetEntity: Storage::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Storage $storage;

    #[ORM\ManyToOne(targetEntity: Box::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Box $box;

    /** RESTRICT : réaffecté au profil fantôme à la suppression du profil. */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Profile $movedBy;

    #[ORM\Column(length: 20, enumType: MoveReason::class)]
    private MoveReason $reason;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $movedAt;

    /** Photographie l'emplacement actuel de $possession, avant qu'il ne change. */
    public static function leaving(Item|Garment $possession, Profile $movedBy, MoveReason $reason): self
    {
        $entry = new self();
        $entry->id = Uuid::v7();
        $entry->item = $possession instanceof Item ? $possession : null;
        $entry->garment = $possession instanceof Garment ? $possession : null;
        $entry->room = $possession->getRoom();
        $entry->storage = $possession->getStorage();
        $entry->box = $possession->getBox();
        $entry->movedBy = $movedBy;
        $entry->reason = $reason;
        $entry->movedAt = new \DateTimeImmutable();

        return $entry;
    }

    private function __construct()
    {
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getItem(): ?Item
    {
        return $this->item;
    }

    public function getGarment(): ?Garment
    {
        return $this->garment;
    }

    public function getRoom(): Room
    {
        return $this->room;
    }

    public function getStorage(): ?Storage
    {
        return $this->storage;
    }

    public function getBox(): ?Box
    {
        return $this->box;
    }

    public function getMovedBy(): Profile
    {
        return $this->movedBy;
    }

    public function getReason(): MoveReason
    {
        return $this->reason;
    }

    public function getMovedAt(): \DateTimeImmutable
    {
        return $this->movedAt;
    }
}
