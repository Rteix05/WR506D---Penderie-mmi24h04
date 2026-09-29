<?php

namespace App\Entity\Sale;

use App\Entity\Trait\TimestampableTrait;
use App\Enum\Sale\PaymentDirection;
use App\Enum\Sale\PaymentMethod;
use App\Enum\Sale\PaymentStatus;
use App\Repository\Sale\PaymentRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Un mouvement d'argent qui transite par la plateforme : l'encaissement
 * (CHARGE) et le reversement au vendeur (PAYOUT) sont deux lignes de la
 * même table.
 *
 * Une vente en espèces n'en crée AUCUN : inventer une ligne « cash » ferait
 * croire à un flux que la plateforme n'a ni vu, ni encaissé, ni ne sait
 * rembourser. Le constructeur le refuse.
 *
 * Le domaine ne connaît aucun prestataire : provider est une chaîne
 * (« stripe »), le SDK n'est jamais importé ici.
 */
#[ORM\Entity(repositoryClass: PaymentRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\UniqueConstraint(name: 'uniq_payment_provider_external', columns: ['provider', 'external_id'])]
#[ORM\Index(name: 'idx_payment_order', columns: ['order_id'])]
class Payment
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Order::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Order $order;

    #[ORM\Column(length: 10, enumType: PaymentDirection::class)]
    private PaymentDirection $direction;

    #[ORM\Column(length: 30)]
    private string $provider;

    /** L'identifiant chez le prestataire : unique par prestataire (un webhook rejoué ne double rien). */
    #[ORM\Column(length: 255)]
    private string $externalId;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $amount;

    #[ORM\Column(length: 3)]
    private string $currency;

    #[ORM\Column(length: 20, enumType: PaymentStatus::class)]
    private PaymentStatus $status = PaymentStatus::Pending;

    /** @var array<string, mixed>|null la réponse du prestataire, pour audit et rejeu */
    #[ORM\Column(type: Types::JSON, nullable: true, options: ['jsonb' => true])]
    private ?array $rawPayload = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $settledAt = null;

    public function __construct(Order $order, PaymentDirection $direction, string $provider, string $externalId, string $amount)
    {
        if (PaymentMethod::Cash === $order->getPaymentMethod()) {
            throw new \LogicException('Une commande en espèces n\'a aucun mouvement d\'argent sur la plateforme.');
        }
        $this->id = Uuid::v7();
        $this->order = $order;
        $this->direction = $direction;
        $this->provider = $provider;
        $this->externalId = $externalId;
        $this->amount = $amount;
        $this->currency = $order->getCurrency();
    }

    /** @param array<string, mixed>|null $rawPayload */
    public function updateFromProvider(PaymentStatus $status, ?array $rawPayload = null): static
    {
        $this->status = $status;
        $this->rawPayload = $rawPayload ?? $this->rawPayload;
        if (PaymentStatus::Captured === $status) {
            $this->settledAt ??= new \DateTimeImmutable();
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

    public function getDirection(): PaymentDirection
    {
        return $this->direction;
    }

    public function getProvider(): string
    {
        return $this->provider;
    }

    public function getExternalId(): string
    {
        return $this->externalId;
    }

    public function getAmount(): string
    {
        return $this->amount;
    }

    public function getCurrency(): string
    {
        return $this->currency;
    }

    public function getStatus(): PaymentStatus
    {
        return $this->status;
    }

    /** @return array<string, mixed>|null */
    public function getRawPayload(): ?array
    {
        return $this->rawPayload;
    }

    public function getSettledAt(): ?\DateTimeImmutable
    {
        return $this->settledAt;
    }
}
