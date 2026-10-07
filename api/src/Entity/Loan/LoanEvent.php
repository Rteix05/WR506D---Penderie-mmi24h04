<?php

namespace App\Entity\Loan;

use App\Entity\Identity\Profile;
use App\Enum\Loan\LoanEventType;
use App\Repository\Loan\LoanEventRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Le journal d'un prêt, en écriture seule : chaque transition et chaque
 * geste laisse une ligne horodatée avec son auteur.
 *
 * Écrit uniquement par Loan (constructeur @internal), jamais modifié :
 * pas de setter, et la migration retire les droits UPDATE et DELETE sur la
 * table (sauf UPDATE de actor_id, pour la réaffectation au profil fantôme).
 */
#[ORM\Entity(repositoryClass: LoanEventRepository::class)]
#[ORM\Index(name: 'idx_loan_event_loan_occurred', columns: ['loan_id', 'occurred_at'])]
class LoanEvent
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Loan::class, inversedBy: 'events')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Loan $loan;

    /** Nul si l'événement est automatique (relance du job quotidien). */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'RESTRICT')]
    private ?Profile $actor;

    #[ORM\Column(length: 30, enumType: LoanEventType::class)]
    private LoanEventType $type;

    /** @var array<string, mixed> ancienne et nouvelle valeur, médias du constat… */
    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true])]
    private array $payload;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $occurredAt;

    /**
     * @internal Écrit par Loan à chaque transition.
     *
     * @param array<string, mixed> $payload
     */
    public function __construct(Loan $loan, LoanEventType $type, ?Profile $actor, array $payload = [])
    {
        $this->id = Uuid::v7();
        $this->loan = $loan;
        $this->type = $type;
        $this->actor = $actor;
        $this->payload = $payload;
        $this->occurredAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getLoan(): Loan
    {
        return $this->loan;
    }

    public function getActor(): ?Profile
    {
        return $this->actor;
    }

    public function getType(): LoanEventType
    {
        return $this->type;
    }

    /** @return array<string, mixed> */
    public function getPayload(): array
    {
        return $this->payload;
    }

    public function getOccurredAt(): \DateTimeImmutable
    {
        return $this->occurredAt;
    }
}
