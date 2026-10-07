<?php

namespace App\Entity\Sale;

use App\Entity\Identity\Profile;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Sale\PaymentDirection;
use App\Enum\Sale\PaymentStatus;
use App\Enum\Sale\RefundStatus;
use App\Repository\Sale\RefundRepository;
use App\Util\Money;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Un remboursement, déclenché dans l'application et exécuté par le
 * prestataire. Réservé au parcours en ligne : il rembourse un encaissement
 * capturé, qu'une commande en espèces n'a pas.
 */
#[ORM\Entity(repositoryClass: RefundRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_refund_order', columns: ['order_id'])]
class Refund
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Order::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Order $order;

    #[ORM\ManyToOne(targetEntity: Payment::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Payment $payment;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Profile $requestedBy;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $amount;

    #[ORM\Column(type: Types::TEXT)]
    #[Assert\NotBlank]
    private string $reason;

    #[ORM\Column(length: 30)]
    private string $provider;

    /** Connu une fois la demande transmise au prestataire. */
    #[ORM\Column(length: 255, nullable: true)]
    private ?string $externalId = null;

    #[ORM\Column(length: 20, enumType: RefundStatus::class)]
    private RefundStatus $status = RefundStatus::Requested;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $processedAt = null;

    public function __construct(Payment $payment, Profile $requestedBy, string $amount, string $reason)
    {
        if (PaymentDirection::Charge !== $payment->getDirection() || PaymentStatus::Captured !== $payment->getStatus()) {
            throw new \LogicException('On ne rembourse qu\'un encaissement capturé.');
        }
        if (Money::compare($amount, '0') <= 0 || Money::compare($amount, $payment->getAmount()) > 0) {
            throw new \LogicException('Le montant remboursé doit être positif et ne pas dépasser le paiement.');
        }
        $this->id = Uuid::v7();
        $this->order = $payment->getOrder();
        $this->payment = $payment;
        $this->requestedBy = $requestedBy;
        $this->amount = $amount;
        $this->reason = $reason;
        $this->provider = $payment->getProvider();
        $this->order->recordRefundRequested($requestedBy);
    }

    /** Le prestataire a traité la demande ; un remboursement réussi clôt la commande en REFUNDED. */
    public function markProcessed(RefundStatus $status, ?string $externalId = null): static
    {
        if (!\in_array($status, [RefundStatus::Processing, RefundStatus::Succeeded, RefundStatus::Failed], true)) {
            throw new \LogicException('Statut de traitement inattendu.');
        }
        $this->status = $status;
        $this->externalId = $externalId ?? $this->externalId;
        if (RefundStatus::Processing !== $status) {
            $this->processedAt = new \DateTimeImmutable();
        }
        if (RefundStatus::Succeeded === $status) {
            $this->order->markRefunded();
        }

        return $this;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getOrder(): Order
    {
        return $this->order;
    }

    public function getPayment(): Payment
    {
        return $this->payment;
    }

    public function getRequestedBy(): Profile
    {
        return $this->requestedBy;
    }

    public function getAmount(): string
    {
        return $this->amount;
    }

    public function getReason(): string
    {
        return $this->reason;
    }

    public function getProvider(): string
    {
        return $this->provider;
    }

    public function getExternalId(): ?string
    {
        return $this->externalId;
    }

    public function getStatus(): RefundStatus
    {
        return $this->status;
    }

    public function getProcessedAt(): ?\DateTimeImmutable
    {
        return $this->processedAt;
    }
}
