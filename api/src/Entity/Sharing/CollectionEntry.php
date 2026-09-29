<?php

namespace App\Entity\Sharing;

use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Media\Media;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Sharing\CollectionEntryKind;
use App\Repository\Sharing\CollectionEntryRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Un élément posé sur une collection : un objet, un vêtement, une image
 * ou un texte. Les champs de mise en page sont nullables : une collection
 * en liste n'en remplit aucun, le cas simple ne paie pas le cas riche.
 *
 * La migration garantit que la colonne remplie correspond au kind.
 */
#[ORM\Entity(repositoryClass: CollectionEntryRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_collection_entry_z', columns: ['collection_id', 'z_index'])]
class CollectionEntry
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Collection::class, inversedBy: 'entries')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Collection $collection;

    #[ORM\Column(length: 20, enumType: CollectionEntryKind::class)]
    private CollectionEntryKind $kind;

    /** CASCADE : supprimer un objet supprime ses entrées, jamais la collection. */
    #[ORM\ManyToOne(targetEntity: Item::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Item $item = null;

    #[ORM\ManyToOne(targetEntity: Garment::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Garment $garment = null;

    /** RESTRICT : une image posée sur un moodboard ne se supprime pas (MDD). */
    #[ORM\ManyToOne(targetEntity: Media::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'RESTRICT')]
    private ?Media $media = null;

    /** La légende, ou le texte lui-même pour un élément TEXT. */
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Assert\Length(max: 1000)]
    private ?string $caption;

    #[ORM\Column(nullable: true)]
    private ?int $positionX = null;

    #[ORM\Column(nullable: true)]
    private ?int $positionY = null;

    #[ORM\Column(nullable: true)]
    #[Assert\Positive]
    private ?int $width = null;

    #[ORM\Column(nullable: true)]
    #[Assert\Positive]
    private ?int $height = null;

    /** En degrés, de -360 à 360. */
    #[ORM\Column(type: Types::SMALLINT, nullable: true)]
    #[Assert\Range(min: -360, max: 360)]
    private ?int $rotation = null;

    /** Superposition sur le moodboard. */
    #[ORM\Column]
    private int $zIndex = 0;

    /** Ordre en mode liste. */
    #[ORM\Column]
    #[Assert\PositiveOrZero]
    private int $position = 0;

    public static function forItem(Collection $collection, Item $item, ?string $caption = null): self
    {
        $entry = new self($collection, CollectionEntryKind::Item, $caption);
        $entry->item = $item;

        return $entry;
    }

    public static function forGarment(Collection $collection, Garment $garment, ?string $caption = null): self
    {
        $entry = new self($collection, CollectionEntryKind::Garment, $caption);
        $entry->garment = $garment;

        return $entry;
    }

    public static function forMedia(Collection $collection, Media $media, ?string $caption = null): self
    {
        $entry = new self($collection, CollectionEntryKind::Media, $caption);
        $entry->media = $media;

        return $entry;
    }

    public static function text(Collection $collection, string $text): self
    {
        return new self($collection, CollectionEntryKind::Text, $text);
    }

    private function __construct(Collection $collection, CollectionEntryKind $kind, ?string $caption)
    {
        $this->id = Uuid::v7();
        $this->collection = $collection;
        $this->kind = $kind;
        $this->caption = $caption;
        $this->position = $collection->getEntries()->count();
        $collection->attachEntry($this);
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getCollection(): Collection
    {
        return $this->collection;
    }

    public function getKind(): CollectionEntryKind
    {
        return $this->kind;
    }

    public function getItem(): ?Item
    {
        return $this->item;
    }

    public function getGarment(): ?Garment
    {
        return $this->garment;
    }

    public function getMedia(): ?Media
    {
        return $this->media;
    }

    public function getCaption(): ?string
    {
        return $this->caption;
    }

    public function setCaption(?string $caption): static
    {
        if (CollectionEntryKind::Text === $this->kind && (null === $caption || '' === trim($caption))) {
            throw new \LogicException('Un élément texte ne peut pas être vide.');
        }
        $this->caption = $caption;

        return $this;
    }

    /** Poser l'élément sur le moodboard. */
    public function placeOnBoard(int $x, int $y, ?int $width = null, ?int $height = null, ?int $rotation = null, ?int $zIndex = null): static
    {
        $this->positionX = $x;
        $this->positionY = $y;
        $this->width = $width;
        $this->height = $height;
        $this->rotation = $rotation;
        $this->zIndex = $zIndex ?? $this->zIndex;

        return $this;
    }

    public function getPositionX(): ?int
    {
        return $this->positionX;
    }

    public function getPositionY(): ?int
    {
        return $this->positionY;
    }

    public function getWidth(): ?int
    {
        return $this->width;
    }

    public function getHeight(): ?int
    {
        return $this->height;
    }

    public function getRotation(): ?int
    {
        return $this->rotation;
    }

    public function getZIndex(): int
    {
        return $this->zIndex;
    }

    public function getPosition(): int
    {
        return $this->position;
    }

    public function setPosition(int $position): static
    {
        $this->position = $position;

        return $this;
    }
}
