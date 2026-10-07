<?php

namespace App\Entity\Sale;

use App\Entity\Identity\Profile;
use App\Enum\Sale\OrderEventType;
use App\Repository\Sale\OrderEventRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Le fil d'une commande, événement par événement : ce que LoanEvent fait
 * pour le prêt. En espèces, c'est la seule preuve de la transaction.
 *
 * Écrit uniquement par Order, jamais modifié : le déclencheur de garde
 * penderie_append_only() refuse toute modification (sauf actor_id, pour la
 * réaffectation au profil fantôme) et toute suppression.
 */
#[ORM\Entity(repositoryClass: OrderEventRepository::class)]
#[ORM\Index(name: 'idx_order_event_order_occurred', columns: ['order_id', 'occurred_at'])]
class OrderEvent
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Order::class, inversedBy: 'events')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Order $order;

    /** Nul si l'événement vient du prestataire ou du système. */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'RESTRICT')]
    private ?Profile $actor;

    #[ORM\Column(length: 40, enumType: OrderEventType::class)]
    private OrderEventType $type;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $note;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $occurredAt;

    /** @internal Écrit par Order à chaque transition. */
    public function __construct(Order $order, OrderEventType $type, ?Profile $actor, ?string $note = null)
    {
        $this->id = Uuid::v7();
        $this->order = $order;
        $this->type = $type;
        $this->actor = $actor;
        $this->note = $note;
        $this->occurredAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getOrder(): Order
    {
        return $this->order;
    }

    public function getActor(): ?Profile
    {
        return $this->actor;
    }

    public function getType(): OrderEventType
    {
        return $this->type;
    }

    public function getNote(): ?string
    {
        return $this->note;
    }

    public function getOccurredAt(): \DateTimeImmutable
    {
        return $this->occurredAt;
    }
}
