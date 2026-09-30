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
use App\Enum\Place\RoomType;
use App\Repository\Place\RoomRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * La pièce : le niveau d'ancrage. Tout objet et tout vêtement en a une,
 * obligatoirement ; rangement et conteneur sont facultatifs.
 */
#[ORM\Entity(repositoryClass: RoomRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_room_place_position', columns: ['place_id', 'position'])]
#[ApiResource(
    shortName: 'Room',
    operations: [
        new GetCollection(),
        new Get(security: "is_granted('VIEW', object)"),
        new Post(denormalizationContext: ['groups' => ['room:write', 'room:create']], securityPostDenormalize: "is_granted('EDIT', object)"),
        new Patch(denormalizationContext: ['groups' => ['room:write']], security: "is_granted('EDIT', object)"),
        new Delete(security: "is_granted('EDIT', object)"),
    ],
    normalizationContext: ['groups' => ['room:read']],
)]
class Room
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[Groups(['room:read'])]
    private Uuid $id;

    /**
     * CASCADE : supprimer un logement vide supprime ses pièces vides. Une
     * pièce qui contient des objets bloquera la suppression (RESTRICT côté
     * objet), et le service imposera de choisir une destination.
     */
    #[ORM\ManyToOne(targetEntity: Place::class, inversedBy: 'rooms')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[Groups(['room:read', 'room:create'])]
    private Place $place;

    #[ORM\Column(length: 80)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 80)]
    #[Groups(['room:read', 'room:write'])]
    private string $name;

    #[ORM\Column(length: 20, enumType: RoomType::class)]
    #[Groups(['room:read', 'room:write'])]
    private RoomType $type;

    #[ORM\ManyToOne(targetEntity: Media::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Media $coverMedia = null;

    /** L'ordre d'affichage dans le logement. */
    #[ORM\Column]
    #[Assert\PositiveOrZero]
    #[Groups(['room:read', 'room:write'])]
    private int $position = 0;

    /** @var Collection<int, Storage> */
    #[ORM\OneToMany(targetEntity: Storage::class, mappedBy: 'room')]
    #[ORM\OrderBy(['position' => 'ASC'])]
    private Collection $storages;

    /** @var Collection<int, Box> */
    #[ORM\OneToMany(targetEntity: Box::class, mappedBy: 'room')]
    private Collection $boxes;

    public function __construct(Place $place, string $name, RoomType $type = RoomType::Other)
    {
        $this->id = Uuid::v7();
        $this->place = $place;
        $this->name = $name;
        $this->type = $type;
        $this->storages = new ArrayCollection();
        $this->boxes = new ArrayCollection();
        $place->attachRoom($this);
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getPlace(): Place
    {
        return $this->place;
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

    public function getType(): RoomType
    {
        return $this->type;
    }

    public function setType(RoomType $type): static
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

    /** @return Collection<int, Storage> */
    public function getStorages(): Collection
    {
        return $this->storages;
    }

    /** @return Collection<int, Box> */
    public function getBoxes(): Collection
    {
        return $this->boxes;
    }

    /** @internal Côté inverse, tenu à jour par Storage. */
    public function attachStorage(Storage $storage): void
    {
        if (!$this->storages->contains($storage)) {
            $this->storages->add($storage);
        }
    }

    /** @internal Côté inverse, tenu à jour par Storage. */
    public function detachStorage(Storage $storage): void
    {
        $this->storages->removeElement($storage);
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
