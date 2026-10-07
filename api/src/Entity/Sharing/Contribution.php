<?php

namespace App\Entity\Sharing;

use App\Entity\Dressing\Outfit;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Media\Media;
use App\Entity\Place\Box;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Place\Storage;
use App\Entity\Reference\GarmentCategory;
use App\Entity\Reference\ItemCategory;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\CollectionEntryKind;
use App\Enum\Sharing\ContributionBasis;
use App\Enum\Sharing\ContributionKind;
use App\Enum\Sharing\ContributionStatus;
use App\Repository\Sharing\ContributionRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Ce qu'une personne autorisée à modifier propose au propriétaire. RIEN
 * n'est appliqué avant sa validation (ContributionReviewer).
 *
 * Qui peut proposer (basis) :
 *  - SHARE : un partage EDIT à son nom (décision du 30/09) ;
 *  - HOUSEHOLD : un autre profil du même compte, dans les limites du
 *    tableau des droits (vérifiées par ResourceAccess::householdMayPropose).
 *
 * Trois sortes :
 *
 *  - PLACE_POSSESSION : ranger un de SES objets chez le propriétaire — le
 *    carton déposé chez un proche. L'objet reste à celui qui le dépose ;
 *    seul son emplacement change, une fois accepté.
 *  - ADD_COLLECTION_ENTRY : poser un objet, un vêtement, une image ou un
 *    texte sur un moodboard partagé.
 *  - EDIT_FIELDS : corriger un champ existant (nom, description), selon une
 *    liste blanche par type de cible.
 *
 * Jamais : supprimer, prêter, vendre (ces gestes restent au propriétaire,
 * aucune sorte de contribution ne les porte).
 */
#[ORM\Entity(repositoryClass: ContributionRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_contribution_grant_status', columns: ['grant_id', 'status'])]
#[ORM\Index(name: 'idx_contribution_contributor', columns: ['contributor_id', 'created_at'])]
#[ORM\Index(name: 'idx_contribution_owner_status', columns: ['owner_id', 'status'])]
class Contribution
{
    use TimestampableTrait;

    /** Les champs qu'une contribution peut corriger, par type de cible. */
    public const EDITABLE_FIELDS = [
        Item::class => ['name', 'description'],
        Garment::class => ['name', 'description'],
        Place::class => ['name', 'description'],
        Room::class => ['name'],
        Storage::class => ['name'],
        Box::class => ['name'],
        GarmentCategory::class => ['name'],
        ItemCategory::class => ['name'],
        Collection::class => ['name', 'description'],
        Outfit::class => ['name'],
    ];

    /** Le nom de chaque type de cible corrigeable (colonne target_type). */
    public const TARGET_TYPES = [
        Item::class => 'ITEM',
        Garment::class => 'GARMENT',
        Place::class => 'PLACE',
        Room::class => 'ROOM',
        Storage::class => 'STORAGE',
        Box::class => 'BOX',
        Collection::class => 'COLLECTION',
        Outfit::class => 'OUTFIT',
        GarmentCategory::class => 'GARMENT_CATEGORY',
        ItemCategory::class => 'ITEM_CATEGORY',
    ];

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $contributor;

    #[ORM\Column(length: 20, enumType: ContributionBasis::class)]
    private ContributionBasis $basis;

    /** SHARE : le partage EDIT qui autorise la proposition (révoqué ou supprimé : la proposition part avec). */
    #[ORM\ManyToOne(targetEntity: Share::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Share $grant;

    /** Celui qui valide : le propriétaire de ce qui serait modifié (ou son tuteur). */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $owner;

    #[ORM\Column(length: 30, enumType: ContributionKind::class)]
    private ContributionKind $kind;

    #[ORM\Column(length: 20, enumType: ContributionStatus::class)]
    private ContributionStatus $status = ContributionStatus::Pending;

    // --- PLACE_POSSESSION : l'objet du contributeur et sa destination -----------------

    #[ORM\ManyToOne(targetEntity: Item::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Item $item = null;

    #[ORM\ManyToOne(targetEntity: Garment::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Garment $garment = null;

    #[ORM\ManyToOne(targetEntity: Room::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Room $room = null;

    #[ORM\ManyToOne(targetEntity: Storage::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Storage $storage = null;

    #[ORM\ManyToOne(targetEntity: Box::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Box $box = null;

    // --- ADD_COLLECTION_ENTRY : l'élément proposé (item/garment ci-dessus, ou) -------

    #[ORM\ManyToOne(targetEntity: Collection::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Collection $collection = null;

    #[ORM\Column(length: 20, nullable: true, enumType: CollectionEntryKind::class)]
    private ?CollectionEntryKind $entryKind = null;

    #[ORM\ManyToOne(targetEntity: Media::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Media $media = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $caption = null;

    // --- EDIT_FIELDS : les nouvelles valeurs proposées ---------------------------------

    /** @var array<string, string>|null */
    #[ORM\Column(type: Types::JSON, nullable: true, options: ['jsonb' => true])]
    private ?array $changes = null;

    /** La cible corrigée (un des TARGET_TYPES) : pas de clé étrangère, la cible est relue à l'acceptation. */
    #[ORM\Column(length: 20, nullable: true)]
    private ?string $targetType = null;

    #[ORM\Column(type: UuidType::NAME, nullable: true)]
    private ?Uuid $targetId = null;

    // --- Décision --------------------------------------------------------------------

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Profile $decidedBy = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $decidedAt = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $note = null;

    private function __construct(Profile $contributor, ?Share $grant, Profile $owner, ContributionKind $kind)
    {
        if (null !== $grant) {
            if (!$grant->isActive() || AccessLevel::Edit !== $grant->getAccessLevel() || !$grant->isRecipient($contributor)) {
                throw new \LogicException('Proposer une modification demande un droit de modifier, actif, à son nom.');
            }
            $owner = $grant->getOwner();
        } elseif ($contributor->isGhost() || $contributor->getId()->equals($owner->getId())
            || !$contributor->getAccount()->getId()->equals($owner->getAccount()->getId())) {
            throw new \LogicException('Sans partage, seul un autre profil du même compte propose une modification.');
        }
        $this->id = Uuid::v7();
        $this->contributor = $contributor;
        $this->grant = $grant;
        $this->basis = null !== $grant ? ContributionBasis::Share : ContributionBasis::Household;
        $this->owner = $owner;
        $this->kind = $kind;
    }

    /**
     * Ranger un de ses objets dans la pièce, le rangement ou le conteneur du
     * propriétaire : par un partage EDIT qui couvre cet emplacement, ou (sans
     * partage) au sein du foyer.
     */
    public static function placePossession(Profile $contributor, ?Share $grant, Item|Garment $possession, Room $room, ?Storage $storage = null, ?Box $box = null): self
    {
        if (!$possession->getOwner()->getId()->equals($contributor->getId())) {
            throw new \LogicException('On ne dépose chez quelqu\'un que ses propres affaires.');
        }
        if (null !== $box) {
            $room = $box->getRoom();
            $storage = $box->getStorage();
        }
        $covered = match (true) {
            $grant instanceof PlaceShare => $grant->getPlace()->getId()->equals($room->getPlace()->getId()),
            $grant instanceof RoomShare => $grant->getRoom()->getId()->equals($room->getId()),
            $grant instanceof StorageShare => null !== $storage && $grant->getStorage()->getId()->equals($storage->getId()),
            $grant instanceof BoxShare => null !== $box && $grant->getBox()->getId()->equals($box->getId()),
            null === $grant => true,
            default => false,
        };
        if (!$covered) {
            throw new \LogicException('Ce droit de modifier ne couvre pas cet emplacement.');
        }

        $destinationOwner = ($box ?? $storage ?? $room)->getOwner();
        $c = new self($contributor, $grant, $destinationOwner, ContributionKind::PlacePossession);
        $c->item = $possession instanceof Item ? $possession : null;
        $c->garment = $possession instanceof Garment ? $possession : null;
        $c->room = $room;
        $c->storage = $storage;
        $c->box = $box;

        return $c;
    }

    /** Poser un élément sur un moodboard partagé : un de ses objets, vêtements, images, ou un texte. */
    public static function addToCollection(Profile $contributor, CollectionShare $grant, Item|Garment|Media|string $content, ?string $caption = null): self
    {
        if (!\is_string($content) && !$content->getOwner()->getId()->equals($contributor->getId())) {
            throw new \LogicException('On ne pose sur un moodboard que ses propres affaires.');
        }
        if (($content instanceof Item || $content instanceof Garment) && $content->isPersonal()) {
            throw new \LogicException('Un objet personnel ne se montre pas, même sur un moodboard.');
        }
        if (\is_string($content) && '' === trim($content)) {
            throw new \LogicException('Un texte vide n\'est pas une contribution.');
        }

        $c = new self($contributor, $grant, $grant->getOwner(), ContributionKind::AddCollectionEntry);
        $c->collection = $grant->getCollection();
        [$c->entryKind, $c->item, $c->garment, $c->media, $c->caption] = match (true) {
            $content instanceof Item => [CollectionEntryKind::Item, $content, null, null, $caption],
            $content instanceof Garment => [CollectionEntryKind::Garment, null, $content, null, $caption],
            $content instanceof Media => [CollectionEntryKind::Media, null, null, $content, $caption],
            default => [CollectionEntryKind::Text, null, null, null, $content],
        };

        return $c;
    }

    /**
     * Corriger des champs d'une cible, dans la liste blanche : la cible
     * même du partage EDIT, ou (sans partage) un bien du foyer.
     *
     * @param array<string, string> $changes
     */
    public static function editFields(Profile $contributor, ?Share $grant, object $target, array $changes): self
    {
        if (null !== $grant && !($target instanceof (self::targetClass($grant)) && $grant->getTargetId()->equals($target->getId()))) {
            throw new \LogicException('Ce droit de modifier porte sur une autre cible.');
        }
        $type = self::typeOf($target);
        $allowed = self::EDITABLE_FIELDS[array_search($type, self::TARGET_TYPES, true)] ?? [];
        if ([] === $changes) {
            throw new \LogicException('Aucune correction proposée.');
        }
        foreach ($changes as $field => $value) {
            if (!\in_array($field, $allowed, true) || !\is_string($value)) {
                throw new \LogicException(\sprintf('Le champ « %s » ne peut pas être corrigé ici.', $field));
            }
        }

        $owner = $target->getOwner() ?? throw new \LogicException('Les données de référence ne se corrigent pas ici.');
        $c = new self($contributor, $grant, $owner, ContributionKind::EditFields);
        $c->changes = $changes;
        $c->targetType = $type;
        $c->targetId = $target->getId();

        return $c;
    }

    /** @return class-string */
    public static function targetClass(Share $grant): string
    {
        return match (true) {
            $grant instanceof ItemShare => Item::class,
            $grant instanceof GarmentShare => Garment::class,
            $grant instanceof PlaceShare => Place::class,
            $grant instanceof RoomShare => Room::class,
            $grant instanceof StorageShare => Storage::class,
            $grant instanceof BoxShare => Box::class,
            $grant instanceof CollectionShare => Collection::class,
            $grant instanceof OutfitShare => Outfit::class,
        };
    }

    /** Le type (TARGET_TYPES) d'une cible, proxies Doctrine compris. */
    public static function typeOf(object $target): string
    {
        foreach (self::TARGET_TYPES as $class => $type) {
            if ($target instanceof $class) {
                return $type;
            }
        }
        throw new \LogicException('Cette ressource ne se corrige pas par une proposition.');
    }

    // --- Décision --------------------------------------------------------------------

    /** @internal Par ContributionReviewer, qui applique la contribution dans la même transaction. */
    public function markAccepted(Profile $reviewer): static
    {
        return $this->decide(ContributionStatus::Accepted, $reviewer, null);
    }

    public function reject(Profile $reviewer, ?string $note = null): static
    {
        $this->assertReviewer($reviewer);

        return $this->decide(ContributionStatus::Rejected, $reviewer, $note);
    }

    public function withdraw(Profile $contributor): static
    {
        if (!$contributor->getId()->equals($this->contributor->getId())) {
            throw new \LogicException('Seul l\'auteur retire sa proposition.');
        }

        return $this->decide(ContributionStatus::Withdrawn, $contributor, null);
    }

    /** Le propriétaire de la cible, ou son tuteur. */
    public function assertReviewer(Profile $reviewer): void
    {
        $owner = $this->owner;
        $isOwner = $owner->getId()->equals($reviewer->getId());
        $isGuardian = null !== $owner->getGuardian() && $owner->getGuardian()->getId()->equals($reviewer->getId());
        if (!$isOwner && !$isGuardian) {
            throw new \LogicException('Seul le propriétaire valide une proposition.');
        }
    }

    private function decide(ContributionStatus $status, Profile $by, ?string $note): static
    {
        if (ContributionStatus::Pending !== $this->status) {
            throw new \LogicException(\sprintf('Cette proposition est déjà close (%s).', $this->status->value));
        }
        $this->status = $status;
        $this->decidedBy = $by;
        $this->decidedAt = new \DateTimeImmutable();
        $this->note = $note;

        return $this;
    }

    // --- Accesseurs ------------------------------------------------------------------

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getContributor(): Profile
    {
        return $this->contributor;
    }

    public function getGrant(): ?Share
    {
        return $this->grant;
    }

    public function getBasis(): ContributionBasis
    {
        return $this->basis;
    }

    public function getOwner(): Profile
    {
        return $this->owner;
    }

    public function getTargetType(): ?string
    {
        return $this->targetType;
    }

    public function getTargetId(): ?Uuid
    {
        return $this->targetId;
    }

    public function getKind(): ContributionKind
    {
        return $this->kind;
    }

    public function getStatus(): ContributionStatus
    {
        return $this->status;
    }

    public function getPossession(): Item|Garment|null
    {
        return $this->item ?? $this->garment;
    }

    public function getRoom(): ?Room
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

    public function getCollection(): ?Collection
    {
        return $this->collection;
    }

    public function getEntryKind(): ?CollectionEntryKind
    {
        return $this->entryKind;
    }

    public function getMedia(): ?Media
    {
        return $this->media;
    }

    public function getCaption(): ?string
    {
        return $this->caption;
    }

    /** @return array<string, string>|null */
    public function getChanges(): ?array
    {
        return $this->changes;
    }

    public function getDecidedBy(): ?Profile
    {
        return $this->decidedBy;
    }

    public function getDecidedAt(): ?\DateTimeImmutable
    {
        return $this->decidedAt;
    }

    public function getNote(): ?string
    {
        return $this->note;
    }
}
