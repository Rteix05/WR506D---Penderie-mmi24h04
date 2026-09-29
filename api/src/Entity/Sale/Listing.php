<?php

namespace App\Entity\Sale;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Inventory\Availability;
use App\Enum\Sale\ListingAudience;
use App\Enum\Sale\ListingStatus;
use App\Repository\Sale\ListingRepository;
use App\Validator\Sale\SellerMaySell;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * L'annonce : seule détentrice de l'état « en vente » (dérivé : une
 * annonce PUBLISHED ou RESERVED existe). On peut publier, retirer, puis
 * republier le même objet : une nouvelle annonce à chaque fois.
 *
 *   DRAFT ─publish→ PUBLISHED ─reserve→ RESERVED ─markSold→ SOLD
 *                     │   ↑─────release──┘
 *                     ├─withdraw→ WITHDRAWN
 *                     └─expire→ EXPIRED
 */
#[ORM\Entity(repositoryClass: ListingRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_listing_status_published', columns: ['status', 'published_at'])]
#[ORM\Index(name: 'idx_listing_item_status', columns: ['item_id', 'status'])]
#[ORM\Index(name: 'idx_listing_garment_status', columns: ['garment_id', 'status'])]
#[ORM\Index(name: 'idx_listing_seller', columns: ['seller_id'])]
// Une seule annonce en cours (publiée ou réservée) par objet : sinon le même
// objet pourrait être vendu deux fois. Prédicat sous sa forme normalisée.
#[ORM\UniqueConstraint(name: 'uniq_listing_on_sale_item', columns: ['item_id'], options: ['where' => "((status)::text = ANY (ARRAY[('PUBLISHED'::character varying)::text, ('RESERVED'::character varying)::text]))"])]
#[ORM\UniqueConstraint(name: 'uniq_listing_on_sale_garment', columns: ['garment_id'], options: ['where' => "((status)::text = ANY (ARRAY[('PUBLISHED'::character varying)::text, ('RESERVED'::character varying)::text]))"])]
#[SellerMaySell]
class Listing
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    /** Toujours le propriétaire de l'objet. RESTRICT : profil fantôme. */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Profile $seller;

    /** Exactement un des deux (CHECK en base). */
    #[ORM\ManyToOne(targetEntity: Item::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'RESTRICT')]
    private ?Item $item = null;

    #[ORM\ManyToOne(targetEntity: Garment::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'RESTRICT')]
    private ?Garment $garment = null;

    /** decimal(10,2), manipulé en chaîne pour ne jamais perdre de centime. */
    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    #[Assert\PositiveOrZero]
    private string $price;

    #[ORM\Column(length: 3)]
    // Pas Assert\Currency : il exige le composant symfony/intl, non installé.
    #[Assert\Regex('/^[A-Z]{3}$/', message: 'Code devise attendu : trois lettres majuscules (« EUR »).')]
    private string $currency = 'EUR';

    /** Pré-remplie depuis l'objet, modifiable. */
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Assert\Length(max: 2000)]
    private ?string $description;

    #[ORM\Column(length: 20, enumType: ListingStatus::class)]
    private ListingStatus $status = ListingStatus::Draft;

    #[ORM\Column(length: 30, enumType: ListingAudience::class)]
    private ListingAudience $audience = ListingAudience::FriendsOnly;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $publishedAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $closedAt = null;

    /** @var Collection<int, ListingMedia> */
    #[ORM\OneToMany(targetEntity: ListingMedia::class, mappedBy: 'listing')]
    #[ORM\OrderBy(['position' => 'ASC'])]
    private Collection $gallery;

    public function __construct(Item|Garment $possession, string $price)
    {
        $this->id = Uuid::v7();
        $this->seller = $possession->getOwner();
        $this->item = $possession instanceof Item ? $possession : null;
        $this->garment = $possession instanceof Garment ? $possession : null;
        $this->price = $price;
        $this->description = $possession->getDescription();
        $this->gallery = new ArrayCollection();
    }

    // --- Transitions --------------------------------------------------------------

    /**
     * Vente et prêt s'excluent (MDD) : on ne publie qu'un objet disponible,
     * ni prêté, ni emprunté, ni perdu, ni déjà vendu.
     */
    public function publish(): static
    {
        $this->assertStatus(ListingStatus::Draft);
        $possession = $this->getPossession();
        if ($possession->isDeleted() || Availability::Available !== $possession->getAvailability()) {
            throw new \LogicException(\sprintf('Un objet %s ne peut pas être mis en vente.', $possession->getAvailability()->value));
        }
        $this->status = ListingStatus::Published;
        $this->publishedAt = new \DateTimeImmutable();

        return $this;
    }

    /** @internal Une commande est passée (Order). */
    public function reserve(): static
    {
        $this->assertStatus(ListingStatus::Published);
        $this->status = ListingStatus::Reserved;

        return $this;
    }

    /** @internal La commande est annulée : l'annonce redevient achetable. */
    public function release(): static
    {
        $this->assertStatus(ListingStatus::Reserved);
        $this->status = ListingStatus::Published;

        return $this;
    }

    /** @internal La commande est conclue : l'objet est vendu. */
    public function markSold(): static
    {
        $this->assertStatus(ListingStatus::Reserved);
        $this->status = ListingStatus::Sold;
        $this->closedAt = new \DateTimeImmutable();
        $this->getPossession()->setAvailability(Availability::Sold);

        return $this;
    }

    public function withdraw(): static
    {
        $this->assertStatus(ListingStatus::Draft, ListingStatus::Published);
        $this->status = ListingStatus::Withdrawn;
        $this->closedAt = new \DateTimeImmutable();

        return $this;
    }

    public function expire(): static
    {
        $this->assertStatus(ListingStatus::Published);
        $this->status = ListingStatus::Expired;
        $this->closedAt = new \DateTimeImmutable();

        return $this;
    }

    private function assertStatus(ListingStatus ...$allowed): void
    {
        if (!\in_array($this->status, $allowed, true)) {
            throw new \LogicException(\sprintf('Transition impossible depuis le statut %s.', $this->status->value));
        }
    }

    // --- Accesseurs ---------------------------------------------------------------

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getSeller(): Profile
    {
        return $this->seller;
    }

    public function getPossession(): Item|Garment
    {
        return $this->item ?? $this->garment ?? throw new \LogicException('Annonce sans objet.');
    }

    public function getItem(): ?Item
    {
        return $this->item;
    }

    public function getGarment(): ?Garment
    {
        return $this->garment;
    }

    public function getPrice(): string
    {
        return $this->price;
    }

    /** Le prix se change tant que personne n'a acheté. */
    public function setPrice(string $price): static
    {
        $this->assertStatus(ListingStatus::Draft, ListingStatus::Published);
        $this->price = $price;

        return $this;
    }

    public function getCurrency(): string
    {
        return $this->currency;
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

    public function getStatus(): ListingStatus
    {
        return $this->status;
    }

    public function isOnSale(): bool
    {
        return \in_array($this->status, [ListingStatus::Published, ListingStatus::Reserved], true);
    }

    public function getAudience(): ListingAudience
    {
        return $this->audience;
    }

    public function setAudience(ListingAudience $audience): static
    {
        $this->audience = $audience;

        return $this;
    }

    public function getPublishedAt(): ?\DateTimeImmutable
    {
        return $this->publishedAt;
    }

    public function getClosedAt(): ?\DateTimeImmutable
    {
        return $this->closedAt;
    }

    /** @return Collection<int, ListingMedia> */
    public function getGallery(): Collection
    {
        return $this->gallery;
    }

    /** @internal Côté inverse, tenu à jour par ListingMedia. */
    public function attachMedia(ListingMedia $link): void
    {
        if (!$this->gallery->contains($link)) {
            $this->gallery->add($link);
        }
    }
}
