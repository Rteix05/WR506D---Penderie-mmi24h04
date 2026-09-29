<?php

namespace App\Entity\Sale;

use App\Entity\Identity\Account;
use App\Entity\Identity\Profile;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Sale\DisputeReason;
use App\Enum\Sale\DisputeStatus;
use App\Repository\Sale\DisputeRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Un litige : il trace et escalade, il n'arbitre pas et ne déplace pas
 * d'argent. Un seul par commande, ouvert par Order::openDispute().
 */
#[ORM\Entity(repositoryClass: DisputeRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_dispute_status', columns: ['status'])]
class Dispute
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\OneToOne(targetEntity: Order::class, inversedBy: 'dispute')]
    #[ORM\JoinColumn(nullable: false, unique: true, onDelete: 'RESTRICT')]
    private Order $order;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Profile $opener;

    #[ORM\Column(length: 30, enumType: DisputeReason::class)]
    private DisputeReason $reason;

    #[ORM\Column(type: Types::TEXT)]
    private string $description;

    #[ORM\Column(length: 20, enumType: DisputeStatus::class)]
    private DisputeStatus $status = DisputeStatus::Open;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $resolution = null;

    /** L'administrateur qui l'a traité. */
    #[ORM\ManyToOne(targetEntity: Account::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Account $handledBy = null;

    /** @internal Par Order::openDispute(). */
    public function __construct(Order $order, Profile $opener, DisputeReason $reason, string $description)
    {
        $this->id = Uuid::v7();
        $this->order = $order;
        $this->opener = $opener;
        $this->reason = $reason;
        $this->description = $description;
    }

    public function takeInCharge(Account $admin): static
    {
        if (!$admin->isAdmin()) {
            throw new \LogicException('Seul un administrateur traite un litige.');
        }
        $this->status = DisputeStatus::UnderReview;
        $this->handledBy = $admin;

        return $this;
    }

    public function resolve(Account $admin, string $resolution, bool $closeOnly = false): static
    {
        if (!$admin->isAdmin()) {
            throw new \LogicException('Seul un administrateur traite un litige.');
        }
        $this->status = $closeOnly ? DisputeStatus::Closed : DisputeStatus::Resolved;
        $this->resolution = $resolution;
        $this->handledBy = $admin;

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

    public function getOpener(): Profile
    {
        return $this->opener;
    }

    public function getReason(): DisputeReason
    {
        return $this->reason;
    }

    public function getDescription(): string
    {
        return $this->description;
    }

    public function getStatus(): DisputeStatus
    {
        return $this->status;
    }

    public function getResolution(): ?string
    {
        return $this->resolution;
    }

    public function getHandledBy(): ?Account
    {
        return $this->handledBy;
    }
}
