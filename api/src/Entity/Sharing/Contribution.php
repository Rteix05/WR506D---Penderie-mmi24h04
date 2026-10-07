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
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\CollectionEntryKind;
use App\Enum\Sharing\ContributionKind;
use App\Enum\Sharing\ContributionStatus;
use App\Repository\Sharing\ContributionRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Ce qu'une personne autorisée à modifier (partage EDIT, décision du
 * 30/09) propose au propriétaire. RIEN n'est appliqué avant sa validation
 * (ContributionReviewer). Trois sortes :
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
class Contribution
{
    use TimestampableTrait;

    /** Les champs qu'une contribution peut corriger, par type de cible. */
    public const EDITABLE_FIELDS = [
        Item::class => ['name', 'description'],
        Garment::class => ['name', 'description'],
        Place::class => ['name', 'description'],
        Room::class => ['name'],
        Box::class => ['name'],
        Collection::class => ['name', 'description'],
        Outfit::class => ['name'],
    ];

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $contributor;

    /** Le partage EDIT qui autorise la proposition ; son propriétaire valide. */
    #[ORM\ManyToOne(targetEntity: Share::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Share $grant;

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

    // --- Décision --------------------------------------------------------------------

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Profile $decidedBy = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $decidedAt = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $note = null;

    private function __construct(Profile $contributor, Share $grant, ContributionKind $kind)
    {
        if (!$grant->isActive() || AccessLevel::Edit !== $grant->getAccessLevel() || !$grant->isRecipient($contributor)) {
            throw new \LogicException('Proposer une modification demande un droit de modifier, actif, à son nom.');
        }
        $this->id = Uuid::v7();
        $this->contributor = $contributor;
        $this->grant = $grant;
        $this->kind = $kind;
    }

    /** Ranger un de ses objets dans la pièce (ou le conteneur) partagé(e) du propriétaire. */
    public static function placePossession(Profile $contributor, Share $grant, Item|Garment $possession, Room $room, ?Storage $storage = null, ?Box $box = null): self
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
            $grant instanceof BoxShare => null !== $box && $grant->getBox()->getId()->equals($box->getId()),
            default => false,
        };
        if (!$covered) {
            throw new \LogicException('Ce droit de modifier ne couvre pas cet emplacement.');
        }

        $c = new self($contributor, $grant, ContributionKind::PlacePossession);
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

        $c = new self($contributor, $grant, ContributionKind::AddCollectionEntry);
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
     * Corriger des champs de la cible du partage, dans la liste blanche.
     *
     * @param array<string, string> $changes
     */
    public static function editFields(Profile $contributor, Share $grant, array $changes): self
    {
        $allowed = self::EDITABLE_FIELDS[self::targetClass($grant)] ?? [];
        if ([] === $changes) {
            throw new \LogicException('Aucune correction proposée.');
        }
        foreach ($changes as $field => $value) {
            if (!\in_array($field, $allowed, true) || !\is_string($value)) {
                throw new \LogicException(\sprintf('Le champ « %s » ne peut pas être corrigé ici.', $field));
            }
        }

        $c = new self($contributor, $grant, ContributionKind::EditFields);
        $c->changes = $changes;

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
            $grant instanceof BoxShare => Box::class,
            $grant instanceof CollectionShare => Collection::class,
            $grant instanceof OutfitShare => Outfit::class,
        };
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
        $owner = $this->grant->getOwner();
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

    public function getGrant(): Share
    {
        return $this->grant;
    }

    public function getOwner(): Profile
    {
        return $this->grant->getOwner();
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
