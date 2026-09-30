<?php

namespace App\Entity\Place;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Entity\Identity\Profile;
use App\Entity\Media\Media;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Place\PlaceType;
use App\Repository\Place\PlaceRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Le logement : résidence principale, second domicile, garde-meuble.
 * Premier niveau de la cascade Place ▸ Room ▸ Storage ▸ Box.
 *
 * Changer de logement ne demande aucun champ : un objet pointe une Room
 * d'une autre Place.
 */
#[ORM\Entity(repositoryClass: PlaceRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_place_owner', columns: ['owner_id'])]
#[ORM\UniqueConstraint(name: 'uniq_place_primary_per_owner', columns: ['owner_id'], options: ['where' => '(is_primary = true)'])]
#[ApiResource(
    shortName: 'Place',
    operations: [
        new GetCollection(),
        new Get(security: "is_granted('VIEW', object)"),
        new Post(denormalizationContext: ['groups' => ['place:write']], securityPostDenormalize: "is_granted('EDIT', object)"),
        new Patch(denormalizationContext: ['groups' => ['place:write']], security: "is_granted('EDIT', object)"),
        new Delete(security: "is_granted('EDIT', object)"),
    ],
    normalizationContext: ['groups' => ['place:read']],
)]
class Place
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[Groups(['place:read'])]
    private Uuid $id;

    /**
     * RESTRICT : à la suppression d'un profil, ses logements sont d'abord
     * transférés au tuteur (profil enfant), jamais détruits en silence.
     */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Profile $owner;

    #[ORM\Column(length: 80)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 80)]
    #[Groups(['place:read', 'place:write'])]
    private string $name;

    #[ORM\Column(length: 20, enumType: PlaceType::class)]
    #[Groups(['place:read', 'place:write'])]
    private PlaceType $type;

    #[ORM\Column(length: 255, nullable: true)]
    #[Assert\Length(max: 255)]
    #[Groups(['place:private', 'place:write'])]
    private ?string $address = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Assert\Length(max: 1000)]
    #[Groups(['place:read', 'place:write'])]
    private ?string $description = null;

    #[ORM\ManyToOne(targetEntity: Media::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Media $coverMedia = null;

    /** La résidence principale : une seule par profil (index unique partiel). */
    #[ORM\Column(name: 'is_primary')]
    #[Groups(['place:read', 'place:write'])]
    private bool $primary = false;

    /** @var Collection<int, Room> */
    #[ORM\OneToMany(targetEntity: Room::class, mappedBy: 'place')]
    #[ORM\OrderBy(['position' => 'ASC'])]
    private Collection $rooms;

    public function __construct(Profile $owner, string $name, PlaceType $type = PlaceType::House)
    {
        $this->id = Uuid::v7();
        $this->owner = $owner;
        $this->name = $name;
        $this->type = $type;
        $this->rooms = new ArrayCollection();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getOwner(): Profile
    {
        return $this->owner;
    }

    /** Transfert au tuteur à la suppression d'un profil enfant. */
    public function transferTo(Profile $owner): static
    {
        $this->owner = $owner;

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

    public function getType(): PlaceType
    {
        return $this->type;
    }

    public function setType(PlaceType $type): static
    {
        $this->type = $type;

        return $this;
    }

    public function getAddress(): ?string
    {
        return $this->address;
    }

    public function setAddress(?string $address): static
    {
        $this->address = $address;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;

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

    public function isPrimary(): bool
    {
        return $this->primary;
    }

    public function setPrimary(bool $primary): static
    {
        $this->primary = $primary;

        return $this;
    }

    /** @return Collection<int, Room> */
    public function getRooms(): Collection
    {
        return $this->rooms;
    }

    /** @internal Côté inverse, tenu à jour par Room. */
    public function attachRoom(Room $room): void
    {
        if (!$this->rooms->contains($room)) {
            $this->rooms->add($room);
        }
    }
}
