<?php

namespace App\Entity\Sale;

use App\Entity\Identity\Profile;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Sale\DeliveryMethod;
use App\Enum\Sale\DisputeReason;
use App\Enum\Sale\OrderEventType as E;
use App\Enum\Sale\OrderStatus as S;
use App\Enum\Sale\PaymentMethod;
use App\Repository\Sale\OrderRepository;
use App\Util\Money;
use App\Validator\Sale\BuyerMayPurchase;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * La transaction. Deux axes indépendants, décidés à l'achat : comment on
 * paie (ONLINE / CASH) et comment l'objet change de mains (SHIPPING /
 * HANDOVER). Le cas « je paie en ligne mais je viens chercher » existe.
 *
 * Deux parcours (arbitrage du 21/09) :
 *
 *  A. En ligne  PENDING_PAYMENT ─capture→ PAID ─ship→ SHIPPED ─deliver→ DELIVERED ─confirmReceipt→ COMPLETED
 *                                          └─(main propre) confirmHandoverByBuyer→ COMPLETED
 *  B. Espèces   AWAITING_HANDOVER ─le vendeur « j'ai été payé » + l'acheteur « j'ai l'objet »→ COMPLETED
 *
 * Comme pour le prêt, chaque transition vérifie son point de départ et son
 * auteur, écrit son OrderEvent (en cascade) et met à jour l'annonce et
 * l'objet dans le même flush. En espèces, les deux confirmations
 * horodatées et attribuées sont la seule preuve qu'un litige examinera.
 *
 * Aucun frais de plateforme (décision du 21/09) : totalAmount ne diffère
 * de itemAmount que par une livraison facturée.
 */
#[ORM\Entity(repositoryClass: OrderRepository::class)]
#[ORM\Table(name: '`order`')]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_order_buyer_status', columns: ['buyer_id', 'status'])]
#[ORM\Index(name: 'idx_order_seller_status', columns: ['seller_id', 'status'])]
// Une seule commande non annulée par annonce (écart assumé avec le
// « unique (listing) » du MDD : une annonce libérée par une annulation doit
// pouvoir être achetée). Prédicat sous sa forme normalisée PostgreSQL.
#[ORM\UniqueConstraint(name: 'uniq_order_open_listing', columns: ['listing_id'], options: ['where' => "((status)::text <> 'CANCELLED'::text)"])]
#[BuyerMayPurchase]
class Order
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Listing::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Listing $listing;

    /** RESTRICT : conservation comptable, qui prime sur l'effacement (profil fantôme). */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Profile $buyer;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Profile $seller;

    /** Le numéro lisible : « PND-7K3QX9MA ». */
    #[ORM\Column(length: 20, unique: true)]
    private string $reference;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $itemAmount;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $totalAmount;

    #[ORM\Column(length: 3)]
    private string $currency;

    #[ORM\Column(length: 20, enumType: PaymentMethod::class)]
    private PaymentMethod $paymentMethod;

    #[ORM\Column(length: 20, enumType: DeliveryMethod::class)]
    private DeliveryMethod $deliveryMethod;

    #[ORM\Column(length: 30, enumType: S::class)]
    private S $status;

    /** « J'ai été payé » (espèces) ou « j'ai remis l'objet » (main propre). */
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $handoverConfirmedBySellerAt = null;

    /** « J'ai l'objet ». */
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $handoverConfirmedByBuyerAt = null;

    /** @var Collection<int, OrderEvent> */
    #[ORM\OneToMany(targetEntity: OrderEvent::class, mappedBy: 'order', cascade: ['persist'])]
    #[ORM\OrderBy(['occurredAt' => 'ASC'])]
    private Collection $events;

    /** @var Collection<int, OrderAddress> */
    #[ORM\OneToMany(targetEntity: OrderAddress::class, mappedBy: 'order', cascade: ['persist'])]
    private Collection $addresses;

    #[ORM\OneToOne(targetEntity: Shipment::class, mappedBy: 'order', cascade: ['persist'])]
    private ?Shipment $shipment = null;

    #[ORM\OneToOne(targetEntity: Dispute::class, mappedBy: 'order', cascade: ['persist'])]
    private ?Dispute $dispute = null;

    /**
     * Passer commande. L'annonce est réservée ; une commande en espèces se
     * remet forcément en main propre (« on ne paie pas un colis en espèces »).
     *
     * @param string $shippingAmount une livraison facturée, jamais une commission
     */
    public function __construct(
        Listing $listing,
        Profile $buyer,
        PaymentMethod $paymentMethod,
        DeliveryMethod $deliveryMethod,
        string $shippingAmount = '0.00',
    ) {
        if (PaymentMethod::Cash === $paymentMethod && DeliveryMethod::Handover !== $deliveryMethod) {
            throw new \LogicException('Une commande en espèces se remet en main propre.');
        }
        if (DeliveryMethod::Handover === $deliveryMethod && 0 !== Money::compare($shippingAmount, '0')) {
            throw new \LogicException('Pas de frais de livraison pour une remise en main propre.');
        }
        if ($buyer->getId()->equals($listing->getSeller()->getId())) {
            throw new \LogicException('On n\'achète pas sa propre annonce.');
        }
        $listing->reserve();

        $this->id = Uuid::v7();
        $this->listing = $listing;
        $this->buyer = $buyer;
        $this->seller = $listing->getSeller();
        $this->reference = self::newReference();
        $this->itemAmount = $listing->getPrice();
        $this->totalAmount = Money::add($listing->getPrice(), $shippingAmount);
        $this->currency = $listing->getCurrency();
        $this->paymentMethod = $paymentMethod;
        $this->deliveryMethod = $deliveryMethod;
        $this->status = PaymentMethod::Cash === $paymentMethod ? S::AwaitingHandover : S::PendingPayment;
        $this->events = new ArrayCollection();
        $this->addresses = new ArrayCollection();
        $this->record(E::Created, $buyer, null);
    }

    /** « PND- » + 8 caractères sans 0/O/1/I, faciles à dicter au téléphone. */
    private static function newReference(): string
    {
        $alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        $code = '';
        foreach (str_split(random_bytes(8)) as $byte) {
            $code .= $alphabet[\ord($byte) % 32];
        }

        return 'PND-'.$code;
    }

    // --- Parcours A : paiement en ligne ------------------------------------------

    /** Événements venus du prestataire (webhooks) : sans auteur. */
    public function recordPaymentAuthorized(): static
    {
        $this->assertOnline();
        $this->assertStatus(S::PendingPayment);

        return $this->record(E::PaymentAuthorized, null, null);
    }

    public function recordPaymentCaptured(): static
    {
        $this->assertOnline();
        $this->assertStatus(S::PendingPayment);
        $this->status = S::Paid;

        return $this->record(E::PaymentCaptured, null, null);
    }

    public function recordPaymentFailed(?string $note = null): static
    {
        $this->assertOnline();
        $this->assertStatus(S::PendingPayment);

        return $this->record(E::PaymentFailed, null, $note);
    }

    public function ship(Profile $seller, string $carrier, ?string $trackingNumber): Shipment
    {
        $this->assertSeller($seller);
        $this->assertStatus(S::Paid);
        if (DeliveryMethod::Shipping !== $this->deliveryMethod) {
            throw new \LogicException('Cette commande se remet en main propre.');
        }
        $this->status = S::Shipped;
        $this->shipment = new Shipment($this, $carrier, $trackingNumber);
        $this->record(E::Shipped, $seller, $trackingNumber);

        return $this->shipment;
    }

    /** Signalé par le transporteur : sans auteur. */
    public function recordDelivered(): static
    {
        $this->assertStatus(S::Shipped);
        $this->status = S::Delivered;
        $this->shipment?->markDelivered();

        return $this->record(E::Delivered, null, null);
    }

    /** L'acheteur confirme la réception du colis : la vente est conclue. */
    public function confirmReceipt(Profile $buyer): static
    {
        $this->assertBuyer($buyer);
        $this->assertStatus(S::Shipped, S::Delivered);
        $this->record(E::Received, $buyer, null);

        return $this->complete();
    }

    // --- Remise en main propre (les deux parcours) --------------------------------

    public function scheduleHandover(Profile $actor, string $note): static
    {
        $this->assertParty($actor);
        $this->assertHandover();
        $this->assertStatus(S::AwaitingHandover, S::Paid);

        return $this->record(E::HandoverScheduled, $actor, $note);
    }

    /** Espèces : « j'ai été payé ». En ligne : « j'ai remis l'objet ». */
    public function confirmHandoverBySeller(Profile $seller): static
    {
        $this->assertSeller($seller);
        $this->assertHandover();
        $this->assertStatus(S::AwaitingHandover, S::Paid);
        if (null !== $this->handoverConfirmedBySellerAt) {
            throw new \LogicException('Le vendeur a déjà confirmé.');
        }
        $this->handoverConfirmedBySellerAt = new \DateTimeImmutable();
        $this->record(E::HandoverConfirmedBySeller, $seller, null);

        return $this->completeHandoverIfConfirmed();
    }

    /** « J'ai l'objet ». */
    public function confirmHandoverByBuyer(Profile $buyer): static
    {
        $this->assertBuyer($buyer);
        $this->assertHandover();
        $this->assertStatus(S::AwaitingHandover, S::Paid);
        if (null !== $this->handoverConfirmedByBuyerAt) {
            throw new \LogicException('L\'acheteur a déjà confirmé.');
        }
        $this->handoverConfirmedByBuyerAt = new \DateTimeImmutable();
        $this->record(E::HandoverConfirmedByBuyer, $buyer, null);

        return $this->completeHandoverIfConfirmed();
    }

    /**
     * Espèces : il faut les DEUX confirmations (c'est la seule preuve).
     * En ligne : l'argent est déjà capturé, la réception par l'acheteur suffit.
     */
    private function completeHandoverIfConfirmed(): static
    {
        $cashDone = PaymentMethod::Cash === $this->paymentMethod
            && null !== $this->handoverConfirmedBySellerAt
            && null !== $this->handoverConfirmedByBuyerAt;
        $onlineDone = PaymentMethod::Online === $this->paymentMethod && null !== $this->handoverConfirmedByBuyerAt;

        return $cashDone || $onlineDone ? $this->complete() : $this;
    }

    private function complete(): static
    {
        $this->status = S::Completed;
        $this->listing->markSold();

        return $this->record(E::Completed, null, null);
    }

    // --- Annulation, remboursement, litige ------------------------------------------

    /**
     * Avant tout paiement ou toute remise seulement : ensuite, c'est un
     * remboursement ou un litige. L'annonce redevient achetable.
     */
    public function cancel(Profile $actor, ?string $note = null): static
    {
        $this->assertParty($actor);
        $this->assertStatus(S::PendingPayment, S::AwaitingHandover);
        if (null !== $this->handoverConfirmedBySellerAt || null !== $this->handoverConfirmedByBuyerAt) {
            throw new \LogicException('Une remise a déjà été confirmée : ouvre un litige.');
        }
        $this->status = S::Cancelled;
        $this->listing->release();

        return $this->record(E::Cancelled, $actor, $note);
    }

    /** @internal Par Refund, à la demande. */
    public function recordRefundRequested(Profile $actor): static
    {
        return $this->record(E::RefundRequested, $actor, null);
    }

    /** @internal Par Refund, quand le prestataire a remboursé. */
    public function markRefunded(): static
    {
        $this->assertOnline();
        $this->assertStatus(S::Paid, S::Shipped, S::Delivered, S::Completed);
        $this->status = S::Refunded;

        return $this->record(E::RefundIssued, null, null);
    }

    /** Un litige par commande, sur les deux parcours ; il ne déplace pas d'argent. */
    public function openDispute(Profile $opener, DisputeReason $reason, string $description): Dispute
    {
        $this->assertParty($opener);
        if (null !== $this->dispute) {
            throw new \LogicException('Un litige est déjà ouvert sur cette commande.');
        }
        if (S::Cancelled === $this->status) {
            throw new \LogicException('Une commande annulée ne fait pas l\'objet d\'un litige.');
        }
        $this->dispute = new Dispute($this, $opener, $reason, $description);
        $this->record(E::DisputeOpened, $opener, $reason->value);

        return $this->dispute;
    }

    /** Figer une adresse au moment de l'achat : une copie, pas une référence. */
    public function freezeAddress(OrderAddress $address): static
    {
        foreach ($this->addresses as $existing) {
            if ($existing->getRole() === $address->getRole()) {
                throw new \LogicException('Cette adresse est déjà figée pour la commande.');
            }
        }
        $this->addresses->add($address);

        return $this;
    }

    // --- Garde-fous ---------------------------------------------------------------

    private function assertStatus(S ...$allowed): void
    {
        if (!\in_array($this->status, $allowed, true)) {
            throw new \LogicException(\sprintf('Transition impossible depuis le statut %s.', $this->status->value));
        }
    }

    private function assertOnline(): void
    {
        if (PaymentMethod::Online !== $this->paymentMethod) {
            throw new \LogicException('Une commande en espèces ne passe pas par le prestataire de paiement.');
        }
    }

    private function assertHandover(): void
    {
        if (DeliveryMethod::Handover !== $this->deliveryMethod) {
            throw new \LogicException('Cette commande est expédiée.');
        }
    }

    private function assertSeller(Profile $profile): void
    {
        if (!$profile->getId()->equals($this->seller->getId())) {
            throw new \LogicException('Seul le vendeur peut faire ce geste.');
        }
    }

    private function assertBuyer(Profile $profile): void
    {
        if (!$profile->getId()->equals($this->buyer->getId())) {
            throw new \LogicException('Seul l\'acheteur peut faire ce geste.');
        }
    }

    private function assertParty(Profile $profile): void
    {
        if (!$profile->getId()->equals($this->seller->getId()) && !$profile->getId()->equals($this->buyer->getId())) {
            throw new \LogicException('Ce profil ne fait pas partie de cette commande.');
        }
    }

    private function record(E $type, ?Profile $actor, ?string $note): static
    {
        $this->events->add(new OrderEvent($this, $type, $actor, $note));

        return $this;
    }

    // --- Accesseurs ---------------------------------------------------------------

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getListing(): Listing
    {
        return $this->listing;
    }

    public function getBuyer(): Profile
    {
        return $this->buyer;
    }

    public function getSeller(): Profile
    {
        return $this->seller;
    }

    public function getReference(): string
    {
        return $this->reference;
    }

    public function getItemAmount(): string
    {
        return $this->itemAmount;
    }

    public function getTotalAmount(): string
    {
        return $this->totalAmount;
    }

    public function getCurrency(): string
    {
        return $this->currency;
    }

    public function getPaymentMethod(): PaymentMethod
    {
        return $this->paymentMethod;
    }

    public function getDeliveryMethod(): DeliveryMethod
    {
        return $this->deliveryMethod;
    }

    public function getStatus(): S
    {
        return $this->status;
    }

    public function getHandoverConfirmedBySellerAt(): ?\DateTimeImmutable
    {
        return $this->handoverConfirmedBySellerAt;
    }

    public function getHandoverConfirmedByBuyerAt(): ?\DateTimeImmutable
    {
        return $this->handoverConfirmedByBuyerAt;
    }

    /** @return Collection<int, OrderEvent> */
    public function getEvents(): Collection
    {
        return $this->events;
    }

    /** @return Collection<int, OrderAddress> */
    public function getAddresses(): Collection
    {
        return $this->addresses;
    }

    public function getShipment(): ?Shipment
    {
        return $this->shipment;
    }

    public function getDispute(): ?Dispute
    {
        return $this->dispute;
    }
}
