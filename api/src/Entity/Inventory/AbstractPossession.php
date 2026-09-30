<?php

namespace App\Entity\Inventory;

use App\Entity\Identity\Profile;
use App\Entity\Place\Box;
use App\Entity\Place\Room;
use App\Entity\Place\Storage;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Inventory\Availability;
use App\Enum\Inventory\Condition;
use App\Enum\Inventory\PossessionSource;
use App\Validator\Inventory\ValidLocation;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Ce que partagent un objet et un vêtement : propriétaire, emplacement,
 * disponibilité, état, achat, provenance, suppression douce. Deux tables
 * distinctes (item, garment), comme décidé en V1.
 *
 * L'emplacement est une cascade Room ▸ Storage ▸ Box : la pièce est
 * obligatoire, le reste facultatif, et l'ensemble cohérent (ValidLocation).
 * Déplacer est une action (voir LocationMover), jamais un statut.
 */
#[ORM\MappedSuperclass]
#[ORM\HasLifecycleCallbacks]
#[ValidLocation]
abstract class AbstractPossession
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[Groups(['possession:read'])]
    protected Uuid $id;

    /** RESTRICT : transféré au tuteur ou traité par le service de suppression. */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    protected Profile $owner;

    /** Seul champ obligatoire à la saisie. */
    #[ORM\Column(length: 120)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 120)]
    #[Groups(['possession:read', 'possession:write'])]
    protected string $name;

    /** Visible de ceux qui ont accès à l'objet. */
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Assert\Length(max: 2000)]
    #[Groups(['possession:read', 'possession:write'])]
    protected ?string $description = null;

    /** Privées : jamais montrées à un autre profil. */
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Assert\Length(max: 2000)]
    #[Groups(['possession:private', 'possession:write'])]
    protected ?string $notes = null;

    #[ORM\Column(length: 20, enumType: Availability::class)]
    #[Groups(['possession:read'])]
    protected Availability $availability = Availability::Available;

    #[ORM\Column(length: 20, nullable: true, enumType: Condition::class)]
    #[Groups(['possession:read', 'possession:write'])]
    protected ?Condition $condition = null;

    /** RESTRICT : une pièce qui contient des objets ne se supprime pas (MDD). */
    #[ORM\ManyToOne(targetEntity: Room::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    #[Groups(['possession:private', 'possession:create'])]
    protected Room $room;

    #[ORM\ManyToOne(targetEntity: Storage::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'RESTRICT')]
    #[Groups(['possession:private'])]
    protected ?Storage $storage = null;

    #[ORM\ManyToOne(targetEntity: Box::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'RESTRICT')]
    #[Groups(['possession:private'])]
    protected ?Box $box = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    #[Assert\LessThanOrEqual('today')]
    #[Groups(['possession:private', 'possession:write'])]
    protected ?\DateTimeImmutable $purchaseDate = null;

    /** decimal(10,2), manipulé en chaîne pour ne jamais perdre de centime. */
    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    #[Assert\PositiveOrZero]
    #[Groups(['possession:private', 'possession:write'])]
    protected ?string $estimatedValue = null;

    #[ORM\Column(length: 20, enumType: PossessionSource::class)]
    #[Groups(['possession:private'])]
    protected PossessionSource $source = PossessionSource::Manual;

    /** @var array<string, mixed>|null ce que le scan a lu, quand source = SCAN */
    #[ORM\Column(type: Types::JSON, nullable: true, options: ['jsonb' => true])]
    protected ?array $scanData = null;

    /**
     * Objet « personnel » (décision du 30/09) : jamais visible par un autre
     * profil, jamais partageable, et caché même quand sa pièce, son
     * logement ou un moodboard qui le contient est partagé. Seuls son
     * propriétaire et le tuteur de celui-ci le voient.
     */
    #[ORM\Column(name: 'is_personal')]
    #[Groups(['possession:private', 'possession:write'])]
    protected bool $personal = false;

    /**
     * Suppression douce : un objet vendu ou prêté reste référencé par une
     * commande et un historique.
     */
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    protected ?\DateTimeImmutable $deletedAt = null;

    public function __construct(Profile $owner, string $name, Room $room)
    {
        $this->id = Uuid::v7();
        $this->owner = $owner;
        $this->name = $name;
        $this->room = $room;
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

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;

        return $this;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): static
    {
        $this->notes = $notes;

        return $this;
    }

    public function getAvailability(): Availability
    {
        return $this->availability;
    }

    /**
     * Les passages LENT / SOLD sont faits par les services de prêt et de
     * vente, dans la même transaction que leur événement.
     */
    public function setAvailability(Availability $availability): static
    {
        $this->availability = $availability;

        return $this;
    }

    public function getCondition(): ?Condition
    {
        return $this->condition;
    }

    public function setCondition(?Condition $condition): static
    {
        $this->condition = $condition;

        return $this;
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

    /**
     * Change l'emplacement, sans trace. Passer par LocationMover, qui écrit
     * l'historique et gère les déplacements en cascade.
     *
     * Le conteneur impose sa pièce et son rangement : ranger un objet dans
     * un carton, c'est le ranger là où est le carton.
     */
    public function placeAt(Room $room, ?Storage $storage = null, ?Box $box = null): static
    {
        if (null !== $box) {
            $room = $box->getRoom();
            $storage = $box->getStorage();
        }
        $this->room = $room;
        $this->storage = $storage;
        $this->box = $box;

        return $this;
    }

    public function getPurchaseDate(): ?\DateTimeImmutable
    {
        return $this->purchaseDate;
    }

    public function setPurchaseDate(?\DateTimeImmutable $purchaseDate): static
    {
        $this->purchaseDate = $purchaseDate;

        return $this;
    }

    public function getEstimatedValue(): ?string
    {
        return $this->estimatedValue;
    }

    public function setEstimatedValue(?string $estimatedValue): static
    {
        $this->estimatedValue = $estimatedValue;

        return $this;
    }

    public function getSource(): PossessionSource
    {
        return $this->source;
    }

    /** @return array<string, mixed>|null */
    public function getScanData(): ?array
    {
        return $this->scanData;
    }

    /** @param array<string, mixed> $scanData */
    public function markScanned(array $scanData): static
    {
        $this->source = PossessionSource::Scan;
        $this->scanData = $scanData;

        return $this;
    }

    public function isPersonal(): bool
    {
        return $this->personal;
    }

    /**
     * Marquer personnel coupe l'accès de tous les partages existants : la
     * règle est appliquée à la lecture (ResourceAccess), pas seulement à la
     * création d'un partage.
     */
    public function setPersonal(bool $personal): static
    {
        $this->personal = $personal;

        return $this;
    }

    public function getDeletedAt(): ?\DateTimeImmutable
    {
        return $this->deletedAt;
    }

    public function isDeleted(): bool
    {
        return null !== $this->deletedAt;
    }

    public function softDelete(): static
    {
        $this->deletedAt ??= new \DateTimeImmutable();

        return $this;
    }

    public function restore(): static
    {
        $this->deletedAt = null;

        return $this;
    }
}
