<?php

namespace App\Entity\Place;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Entity\Media\Media;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Place\StorageType;
use App\Repository\Place\StorageRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Le meuble ou le rangement : armoire, étagère, commode, portant.
 */
#[ORM\Entity(repositoryClass: StorageRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_storage_room_position', columns: ['room_id', 'position'])]
#[ApiResource(
    shortName: 'Storage',
    operations: [
        new GetCollection(),
        new Get(security: "is_granted('VIEW', object)"),
        new Post(denormalizationContext: ['groups' => ['storage:write', 'storage:create']], securityPostDenormalize: "is_granted('EDIT', object)"),
        new Patch(denormalizationContext: ['groups' => ['storage:write']], security: "is_granted('EDIT', object)"),
        new Delete(security: "is_granted('EDIT', object)"),
    ],
    normalizationContext: ['groups' => ['storage:read']],
)]
class Storage
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[Groups(['storage:read'])]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Room::class, inversedBy: 'storages')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[Groups(['storage:read', 'storage:create'])]
    private Room $room;

    #[ORM\Column(length: 80)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 80)]
    #[Groups(['storage:read', 'storage:write'])]
    private string $name;

    #[ORM\Column(length: 20, enumType: StorageType::class)]
    #[Groups(['storage:read', 'storage:write'])]
    private StorageType $type;

    #[ORM\ManyToOne(targetEntity: Media::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Media $coverMedia = null;

    /** L'ordre d'affichage dans la pièce. */
    #[ORM\Column]
    #[Assert\PositiveOrZero]
    #[Groups(['storage:read', 'storage:write'])]
    private int $position = 0;

    /** @var Collection<int, Box> */
    #[ORM\OneToMany(targetEntity: Box::class, mappedBy: 'storage')]
    private Collection $boxes;

    public function __construct(Room $room, string $name, StorageType $type = StorageType::Other)
    {
        $this->id = Uuid::v7();
        $this->room = $room;
        $this->name = $name;
        $this->type = $type;
        $this->boxes = new ArrayCollection();
        $room->attachStorage($this);
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getRoom(): Room
    {
        return $this->room;
    }

    /**
     * Déplacer un meuble dans une autre pièce. Ses conteneurs le suivent :
     * un conteneur posé sur un rangement est toujours dans la même pièce.
     * Les objets rangés dedans suivront avec l'inventaire, dans le même
     * service transactionnel.
     */
    public function moveTo(Room $room): static
    {
        $this->room->detachStorage($this);
        $this->room = $room;
        $room->attachStorage($this);
        // Copie : chaque Box se retire puis se réinscrit dans $this->boxes.
        foreach ($this->boxes->toArray() as $box) {
            $box->moveTo($room, $this);
        }

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

    public function getType(): StorageType
    {
        return $this->type;
    }

    public function setType(StorageType $type): static
    {
        $this->type = $type;

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

    public function getPosition(): int
    {
        return $this->position;
    }

    public function setPosition(int $position): static
    {
        $this->position = $position;

        return $this;
    }

    /** @return Collection<int, Box> */
    public function getBoxes(): Collection
    {
        return $this->boxes;
    }

    /** @internal Côté inverse, tenu à jour par Box. */
    public function attachBox(Box $box): void
    {
        if (!$this->boxes->contains($box)) {
            $this->boxes->add($box);
        }
    }

    /** @internal Côté inverse, tenu à jour par Box. */
    public function detachBox(Box $box): void
    {
        $this->boxes->removeElement($box);
    }
}
