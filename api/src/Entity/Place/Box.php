<?php

namespace App\Entity\Place;

use App\Entity\Media\Media;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Place\BoxType;
use App\Repository\Place\BoxRepository;
use App\Validator\Place\BoxInStorageRoom;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Le conteneur : 4e niveau, facultatif, de la cascade de rangement.
 *
 * Décision du 29/09 : ce n'est plus seulement un carton. Son type dit ce
 * qu'il est (carton, étagère intérieure, tiroir, bac, valise…), ce qui
 * représente « Chambre › Armoire › Étagère 2 » sans imbriquer les
 * rangements. Toujours dans une pièce, éventuellement posé sur un
 * rangement de cette même pièce.
 */
#[ORM\Entity(repositoryClass: BoxRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_box_room', columns: ['room_id'])]
#[ORM\Index(name: 'idx_box_reference', columns: ['reference'])]
#[BoxInStorageRoom]
class Box
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Room::class, inversedBy: 'boxes')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Room $room;

    /**
     * SET NULL : si le meuble disparaît, le conteneur reste dans la pièce,
     * posé au sol plutôt que supprimé avec son contenu.
     */
    #[ORM\ManyToOne(targetEntity: Storage::class, inversedBy: 'boxes')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Storage $storage;

    #[ORM\Column(length: 80)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 80)]
    private string $name;

    #[ORM\Column(length: 20, enumType: BoxType::class)]
    private BoxType $type;

    /** L'étiquette ou le contenu du QR code collé dessus. */
    #[ORM\Column(length: 100, nullable: true)]
    #[Assert\Length(max: 100)]
    private ?string $reference = null;

    #[ORM\ManyToOne(targetEntity: Media::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Media $coverMedia = null;

    /** Carton fermé : n'a de sens que pour le type CARTON (CHECK en base). */
    #[ORM\Column]
    private bool $isSealed = false;

    public function __construct(Room $room, string $name, BoxType $type = BoxType::Carton, ?Storage $storage = null)
    {
        $this->id = Uuid::v7();
        $this->name = $name;
        $this->type = $type;
        $this->room = $room;
        $this->storage = $storage;
        $room->attachBox($this);
        $storage?->attachBox($this);
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getRoom(): Room
    {
        return $this->room;
    }

    public function getStorage(): ?Storage
    {
        return $this->storage;
    }

    /**
     * Déplacer le conteneur. Son contenu suivra avec l'inventaire, dans le
     * même service transactionnel (réaffectation de room et storage).
     */
    public function moveTo(Room $room, ?Storage $storage = null): static
    {
        // Les deux côtés de chaque relation sont tenus à jour en mémoire :
        // Doctrine ne persiste que ce côté-ci, mais Storage::moveTo()
        // parcourt la collection inverse.
        $this->room->detachBox($this);
        $this->storage?->detachBox($this);
        $this->room = $room;
        $this->storage = $storage;
        $room->attachBox($this);
        $storage?->attachBox($this);

        return $this;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getType(): BoxType
    {
        return $this->type;
    }

    public function setType(BoxType $type): static
    {
        $this->type = $type;
        if (BoxType::Carton !== $type) {
            $this->isSealed = false;
        }

        return $this;
    }

    public function getReference(): ?string
    {
        return $this->reference;
    }

    public function setReference(?string $reference): static
    {
        $this->reference = $reference;

        return $this;
    }

    public function getCoverMedia(): ?Media
    {
        return $this->coverMedia;
    }

    public function setCoverMedia(?Media $coverMedia): static
    {
        $this->coverMedia = $coverMedia;

        return $this;
    }

    public function isSealed(): bool
    {
        return $this->isSealed;
    }

    public function seal(): static
    {
        if (BoxType::Carton !== $this->type) {
            throw new \LogicException('Seul un carton peut être scellé.');
        }
        $this->isSealed = true;

        return $this;
    }

    public function unseal(): static
    {
        $this->isSealed = false;

        return $this;
    }
}
