<?php

namespace App\Entity\Sale;

use App\Entity\Trait\TimestampableTrait;
use App\Enum\Sale\ShipmentStatus;
use App\Repository\Sale\ShipmentRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * L'expédition, qui n'existe que pour une commande SHIPPING (créée par
 * Order::ship()). Elle trace, le transporteur fait le reste.
 */
#[ORM\Entity(repositoryClass: ShipmentRepository::class)]
#[ORM\HasLifecycleCallbacks]
class Shipment
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\OneToOne(targetEntity: Order::class, inversedBy: 'shipment')]
    #[ORM\JoinColumn(nullable: false, unique: true, onDelete: 'RESTRICT')]
    private Order $order;

    #[ORM\Column(length: 50)]
    private string $carrier;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $trackingNumber;

    #[ORM\Column(length: 20, enumType: ShipmentStatus::class)]
    private ShipmentStatus $status = ShipmentStatus::Shipped;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $shippedAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $deliveredAt = null;

    /** @internal Par Order::ship(). */
    public function __construct(Order $order, string $carrier, ?string $trackingNumber)
    {
        $this->id = Uuid::v7();
        $this->order = $order;
        $this->carrier = $carrier;
        $this->trackingNumber = $trackingNumber;
        $this->shippedAt = new \DateTimeImmutable();
    }

    /** @internal Par Order::recordDelivered(). */
    public function markDelivered(): static
    {
        $this->status = ShipmentStatus::Delivered;
        $this->deliveredAt = new \DateTimeImmutable();

        return $this;
    }

    public function updateStatus(ShipmentStatus $status): static
    {
        $this->status = $status;

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

    public function getCarrier(): string
    {
        return $this->carrier;
    }

    public function getTrackingNumber(): ?string
    {
        return $this->trackingNumber;
    }

    public function getStatus(): ShipmentStatus
    {
        return $this->status;
    }

    public function getShippedAt(): \DateTimeImmutable
    {
        return $this->shippedAt;
    }

    public function getDeliveredAt(): ?\DateTimeImmutable
    {
        return $this->deliveredAt;
    }
}
