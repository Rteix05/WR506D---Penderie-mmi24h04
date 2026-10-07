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
use App\Enum\Place\RoomType;
use App\Repository\Place\RoomRepository;
use App\State\PlaceRemovalProcessor;
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
 *
 * Colocation (décision du 30/09) : une pièce a un CRÉATEUR, son
 * propriétaire. Elle est COMMUNE par défaut (tous les colocs la voient,
 * la modifient directement, y rangent leurs affaires) ou FERMÉE par son
 * créateur : seuls lui et les colocs qu'il autorise la voient, avec ses
 * rangements, conteneurs et objets. Rouvrir : le créateur, ou n'importe
 * quel membre si le créateur a quitté le logement.
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
        new Delete(security: "is_granted('EDIT', object)", processor: PlaceRemovalProcessor::class),
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

    /** RESTRICT : ProfileDeleter transfère au tuteur les pièces d'un enfant. */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Profile $createdBy;

    /** Fermée aux autres colocs (sans effet hors colocation). */
    #[ORM\Column(name: 'is_closed')]
    #[Groups(['room:read'])]
    private bool $closed = false;

    /**
     * Les colocs que le créateur autorise dans sa pièce fermée.
     *
     * @var Collection<int, Profile>
     */
    #[ORM\ManyToMany(targetEntity: Profile::class)]
    #[ORM\JoinTable(name: 'room_allowed_member')]
    #[ORM\JoinColumn(name: 'room_id', onDelete: 'CASCADE')]
    #[ORM\InverseJoinColumn(name: 'profile_id', onDelete: 'CASCADE')]
    private Collection $allowedMembers;

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

    /** @param Profile|null $createdBy le profil actif (injecté par l'API) ; par défaut le référent du logement */
    public function __construct(Place $place, string $name, RoomType $type = RoomType::Other, ?Profile $createdBy = null)
    {
        $this->id = Uuid::v7();
        $this->place = $place;
        $this->createdBy = $createdBy ?? $place->getOwner();
        $this->allowedMembers = new ArrayCollection();
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

    /** Le propriétaire de la pièce : celui qui l'a créée. */
    public function getOwner(): Profile
    {
        return $this->createdBy;
    }

    public function getCreatedBy(): Profile
    {
        return $this->createdBy;
    }

    /** @internal Transfert au tuteur à la suppression d'un profil enfant. */
    public function transferTo(Profile $owner): static
    {
        $this->createdBy = $owner;

        return $this;
    }

    public function isClosed(): bool
    {
        return $this->closed;
    }

    /** Le créateur est-il toujours membre du logement ? Sinon, n'importe quel membre peut rouvrir. */
    public function isCreatorPresent(): bool
    {
        return $this->place->hasMember($this->createdBy);
    }

    public function close(Profile $by): static
    {
        if (!$by->getId()->equals($this->createdBy->getId())) {
            throw new \LogicException('Seul celui qui a créé la pièce la ferme.');
        }
        $this->closed = true;

        return $this;
    }

    public function open(Profile $by): static
    {
        $mayOpen = $by->getId()->equals($this->createdBy->getId())
            || (!$this->isCreatorPresent() && $this->place->hasMember($by));
        if (!$mayOpen) {
            throw new \LogicException('Seul le créateur rouvre sa pièce (ou un membre, s\'il a quitté le logement).');
        }
        $this->closed = false;
        $this->allowedMembers->clear();

        return $this;
    }

    /** @return Collection<int, Profile> */
    public function getAllowedMembers(): Collection
    {
        return $this->allowedMembers;
    }

    public function isAllowed(Profile $profile): bool
    {
        foreach ($this->allowedMembers as $allowed) {
            if ($allowed->getId()->equals($profile->getId())) {
                return true;
            }
        }

        return false;
    }

    /** Le créateur autorise un coloc dans sa pièce fermée. */
    public function allow(Profile $by, Profile $member): static
    {
        if (!$by->getId()->equals($this->createdBy->getId())) {
            throw new \LogicException('Seul celui qui a créé la pièce y autorise quelqu\'un.');
        }
        if (!$this->place->hasMember($member)) {
            throw new \LogicException('On n\'autorise dans une pièce qu\'un membre du logement.');
        }
        if (!$this->isAllowed($member) && !$member->getId()->equals($this->createdBy->getId())) {
            $this->allowedMembers->add($member);
        }

        return $this;
    }

    public function disallow(Profile $by, Profile $member): static
    {
        if (!$by->getId()->equals($this->createdBy->getId())) {
            throw new \LogicException('Seul celui qui a créé la pièce y retire une autorisation.');
        }
        foreach ($this->allowedMembers->toArray() as $allowed) {
            if ($allowed->getId()->equals($member->getId())) {
                $this->allowedMembers->removeElement($allowed);
            }
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
