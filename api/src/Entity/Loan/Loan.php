<?php

namespace App\Entity\Loan;

use App\Entity\Identity\ApprovalRequest;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Inventory\Availability;
use App\Enum\Inventory\Condition;
use App\Enum\Loan\LoanEventType;
use App\Enum\Loan\LoanStatus;
use App\Repository\Loan\LoanRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Un prêt, de la demande au retour. L'historique est conservé : un objet
 * accumule ses prêts successifs.
 *
 * Machine à états portée par l'entité : chaque transition vérifie son
 * point de départ et son auteur, écrit son LoanEvent (persisté en
 * cascade) et met à jour la disponibilité de l'objet, le tout dans le
 * même flush, donc la même transaction (règle du MDD).
 *
 *   REQUESTED ─accept→ ACCEPTED ─markReceived→ ACTIVE ─confirmReturn→ RETURNED
 *       │                 │                       └──declareLost→ LOST
 *       ├─decline→ DECLINED
 *       └─cancel→ CANCELLED ←cancel─┘
 *   offer() : le propriétaire prête de lui-même, le prêt naît ACCEPTED.
 *
 * L'emplacement habituel de l'objet ne bouge pas : « Chez Thomas » est
 * dérivé du prêt actif, et au retour il n'y a rien à restaurer.
 */
#[ORM\Entity(repositoryClass: LoanRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_loan_status_due', columns: ['status', 'due_date'])]
#[ORM\Index(name: 'idx_loan_borrower_status', columns: ['borrower_id', 'status'])]
#[ORM\Index(name: 'idx_loan_lender_status', columns: ['lender_id', 'status'])]
// Un seul prêt actif par objet : la règle métier la plus importante, garantie
// en base. Le prédicat est écrit sous la forme normalisée que PostgreSQL
// stocke pour une colonne varchar, sinon chaque diff Doctrine le recréerait.
#[ORM\UniqueConstraint(name: 'uniq_loan_active_item', columns: ['item_id'], options: ['where' => "((status)::text = 'ACTIVE'::text)"])]
#[ORM\UniqueConstraint(name: 'uniq_loan_active_garment', columns: ['garment_id'], options: ['where' => "((status)::text = 'ACTIVE'::text)"])]
class Loan
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    /** Exactement un des deux (CHECK en base). RESTRICT : l'historique survit. */
    #[ORM\ManyToOne(targetEntity: Item::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'RESTRICT')]
    private ?Item $item = null;

    #[ORM\ManyToOne(targetEntity: Garment::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'RESTRICT')]
    private ?Garment $garment = null;

    /** Toujours le propriétaire de l'objet, jamais choisi par l'appelant. */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Profile $lender;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Profile $borrower;

    #[ORM\Column(length: 20, enumType: LoanStatus::class)]
    private LoanStatus $status;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $requestedAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $acceptedAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $receivedAt = null;

    /** Facultative (décision client du 21/09) : « Retour prévu : non défini ». */
    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $dueDate = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $returnDeclaredAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $returnConfirmedAt = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Assert\Length(max: 1000)]
    private ?string $note = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Assert\Length(max: 1000)]
    private ?string $returnNote = null;

    #[ORM\Column(length: 20, nullable: true, enumType: Condition::class)]
    private ?Condition $conditionAtStart = null;

    #[ORM\Column(length: 20, nullable: true, enumType: Condition::class)]
    private ?Condition $conditionAtReturn = null;

    /** L'accord du tuteur, si l'emprunteur est un profil sous tutelle. */
    #[ORM\ManyToOne(targetEntity: ApprovalRequest::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?ApprovalRequest $approvalRequest = null;

    /** @var Collection<int, LoanEvent> */
    #[ORM\OneToMany(targetEntity: LoanEvent::class, mappedBy: 'loan', cascade: ['persist'])]
    #[ORM\OrderBy(['occurredAt' => 'ASC'])]
    private Collection $events;

    /** L'emprunteur demande. */
    public static function request(Item|Garment $possession, Profile $borrower, ?string $note = null, ?ApprovalRequest $approvalRequest = null): self
    {
        $loan = new self($possession, $borrower, LoanStatus::Requested);
        $loan->note = $note;
        $loan->approvalRequest = $approvalRequest;
        $loan->record(LoanEventType::Requested, $borrower);

        return $loan;
    }

    /** Le propriétaire prête de lui-même : le prêt naît accepté. */
    public static function offer(Item|Garment $possession, Profile $borrower, ?\DateTimeImmutable $dueDate = null, ?string $note = null): self
    {
        $loan = new self($possession, $borrower, LoanStatus::Accepted);
        $loan->acceptedAt = $loan->requestedAt;
        $loan->dueDate = $dueDate;
        $loan->note = $note;
        $loan->record(LoanEventType::Accepted, $loan->lender, ['offered' => true]);

        return $loan;
    }

    private function __construct(Item|Garment $possession, Profile $borrower, LoanStatus $status)
    {
        $lender = $possession->getOwner();
        if ($lender->getId()->equals($borrower->getId())) {
            throw new \LogicException('On ne se prête pas un objet à soi-même.');
        }
        if ($borrower->isGhost()) {
            throw new \LogicException('Le profil fantôme n\'emprunte rien.');
        }
        if ($possession->isDeleted()) {
            throw new \LogicException('Cet objet a été supprimé.');
        }
        // Pas de sous-prêt, et vente et prêt s'excluent (MDD) : seul un objet
        // disponible se prête.
        if (Availability::Available !== $possession->getAvailability()) {
            throw new \LogicException(\sprintf('Un objet %s ne peut pas être prêté.', $possession->getAvailability()->value));
        }

        $this->id = Uuid::v7();
        $this->item = $possession instanceof Item ? $possession : null;
        $this->garment = $possession instanceof Garment ? $possession : null;
        $this->lender = $lender;
        $this->borrower = $borrower;
        $this->status = $status;
        $this->requestedAt = new \DateTimeImmutable();
        $this->events = new ArrayCollection();
    }

    // --- Transitions --------------------------------------------------------------

    public function accept(Profile $lender, ?\DateTimeImmutable $dueDate = null): static
    {
        $this->assertLender($lender);
        $this->assertStatus(LoanStatus::Requested);
        $this->status = LoanStatus::Accepted;
        $this->acceptedAt = new \DateTimeImmutable();
        $this->dueDate = $dueDate ?? $this->dueDate;

        return $this->record(LoanEventType::Accepted, $lender);
    }

    public function decline(Profile $lender, ?string $reason = null): static
    {
        $this->assertLender($lender);
        $this->assertStatus(LoanStatus::Requested);
        $this->status = LoanStatus::Declined;

        return $this->record(LoanEventType::Declined, $lender, ['reason' => $reason]);
    }

    /** Annulé par l'un ou l'autre, tant que l'objet n'a pas été remis. */
    public function cancel(Profile $actor): static
    {
        $this->assertParty($actor);
        $this->assertStatus(LoanStatus::Requested, LoanStatus::Accepted);
        $this->status = LoanStatus::Cancelled;

        return $this->record(LoanEventType::Cancelled, $actor);
    }

    /**
     * L'emprunteur a l'objet en main : le prêt devient actif, l'objet LENT,
     * et son état du moment est noté pour constater un dommage au retour.
     */
    public function markReceived(Profile $borrower): static
    {
        $this->assertBorrower($borrower);
        $this->assertStatus(LoanStatus::Accepted);
        $possession = $this->getPossession();
        if (Availability::Available !== $possession->getAvailability()) {
            throw new \LogicException('L\'objet n\'est plus disponible.');
        }
        $this->status = LoanStatus::Active;
        $this->receivedAt = new \DateTimeImmutable();
        $this->conditionAtStart = $possession->getCondition();
        $possession->setAvailability(Availability::Lent);

        return $this->record(LoanEventType::Received, $borrower);
    }

    /** Repousser (ou retirer) la date de retour annule le retard immédiatement. */
    public function changeDueDate(Profile $lender, ?\DateTimeImmutable $dueDate): static
    {
        $this->assertLender($lender);
        $this->assertStatus(LoanStatus::Requested, LoanStatus::Accepted, LoanStatus::Active);
        $old = $this->dueDate;
        $this->dueDate = $dueDate;

        return $this->record(LoanEventType::DueDateChanged, $lender, [
            'old' => $old?->format('Y-m-d'),
            'new' => $dueDate?->format('Y-m-d'),
        ]);
    }

    /** Relance du job quotidien : événement automatique, sans auteur. */
    public function recordReminder(): static
    {
        $this->assertStatus(LoanStatus::Active);

        return $this->record(LoanEventType::ReminderSent, null, ['dueDate' => $this->dueDate?->format('Y-m-d')]);
    }

    /** L'emprunteur dit avoir rendu l'objet ; le prêteur doit confirmer. */
    public function declareReturn(Profile $borrower, ?string $note = null): static
    {
        $this->assertBorrower($borrower);
        $this->assertStatus(LoanStatus::Active);
        $this->returnDeclaredAt = new \DateTimeImmutable();
        $this->returnNote = $note;

        return $this->record(LoanEventType::ReturnDeclared, $borrower);
    }

    /**
     * Le prêteur confirme le retour et constate l'état : l'objet redevient
     * disponible, prend l'état constaté, et un dommage est journalisé.
     *
     * @param list<string> $damageMediaIds les photos du constat
     */
    public function confirmReturn(Profile $lender, ?Condition $conditionAtReturn = null, ?string $note = null, array $damageMediaIds = []): static
    {
        $this->assertLender($lender);
        $this->assertStatus(LoanStatus::Active);
        $possession = $this->getPossession();
        $this->status = LoanStatus::Returned;
        $this->returnConfirmedAt = new \DateTimeImmutable();
        $this->conditionAtReturn = $conditionAtReturn;
        $this->returnNote = $note ?? $this->returnNote;
        $possession->setAvailability(Availability::Available);
        if (null !== $conditionAtReturn) {
            $possession->setCondition($conditionAtReturn);
        }
        $this->record(LoanEventType::Returned, $lender);

        if ($this->isDamaged()) {
            $this->record(LoanEventType::DamageReported, $lender, [
                'before' => $this->conditionAtStart?->value,
                'after' => $this->conditionAtReturn?->value,
                'media' => $damageMediaIds,
            ]);
        }

        return $this;
    }

    public function declareLost(Profile $lender): static
    {
        $this->assertLender($lender);
        $this->assertStatus(LoanStatus::Active);
        $this->status = LoanStatus::Lost;
        $this->getPossession()->setAvailability(Availability::Lost);

        return $this->record(LoanEventType::DeclaredLost, $lender);
    }

    // --- États dérivés ------------------------------------------------------------

    /** En retard = actif et date de retour dépassée. Jamais stocké (MDD). */
    public function isOverdue(?\DateTimeImmutable $today = null): bool
    {
        $today ??= new \DateTimeImmutable('today');

        return LoanStatus::Active === $this->status && null !== $this->dueDate && $this->dueDate < $today;
    }

    /** Endommagé = rendu dans un état pire qu'au départ. */
    public function isDamaged(): bool
    {
        return null !== $this->conditionAtStart
            && null !== $this->conditionAtReturn
            && $this->conditionAtReturn->isWorseThan($this->conditionAtStart);
    }

    // --- Garde-fous ---------------------------------------------------------------

    private function assertStatus(LoanStatus ...$allowed): void
    {
        if (!\in_array($this->status, $allowed, true)) {
            throw new \LogicException(\sprintf('Transition impossible depuis le statut %s.', $this->status->value));
        }
    }

    private function assertLender(Profile $profile): void
    {
        if (!$profile->getId()->equals($this->lender->getId())) {
            throw new \LogicException('Seul le prêteur peut faire ce geste.');
        }
    }

    private function assertBorrower(Profile $profile): void
    {
        if (!$profile->getId()->equals($this->borrower->getId())) {
            throw new \LogicException('Seul l\'emprunteur peut faire ce geste.');
        }
    }

    private function assertParty(Profile $profile): void
    {
        if (!$profile->getId()->equals($this->lender->getId()) && !$profile->getId()->equals($this->borrower->getId())) {
            throw new \LogicException('Ce profil ne fait pas partie de ce prêt.');
        }
    }

    /** @param array<string, mixed> $payload */
    private function record(LoanEventType $type, ?Profile $actor, array $payload = []): static
    {
        $this->events->add(new LoanEvent($this, $type, $actor, $payload));

        return $this;
    }

    // --- Accesseurs ---------------------------------------------------------------

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getPossession(): Item|Garment
    {
        return $this->item ?? $this->garment ?? throw new \LogicException('Prêt sans objet.');
    }

    public function getItem(): ?Item
    {
        return $this->item;
    }

    public function getGarment(): ?Garment
    {
        return $this->garment;
    }

    public function getLender(): Profile
    {
        return $this->lender;
    }

    public function getBorrower(): Profile
    {
        return $this->borrower;
    }

    public function getStatus(): LoanStatus
    {
        return $this->status;
    }

    public function getRequestedAt(): \DateTimeImmutable
    {
        return $this->requestedAt;
    }

    public function getAcceptedAt(): ?\DateTimeImmutable
    {
        return $this->acceptedAt;
    }

    public function getReceivedAt(): ?\DateTimeImmutable
    {
        return $this->receivedAt;
    }

    public function getDueDate(): ?\DateTimeImmutable
    {
        return $this->dueDate;
    }

    public function getReturnDeclaredAt(): ?\DateTimeImmutable
    {
        return $this->returnDeclaredAt;
    }

    public function getReturnConfirmedAt(): ?\DateTimeImmutable
    {
        return $this->returnConfirmedAt;
    }

    public function getNote(): ?string
    {
        return $this->note;
    }

    public function getReturnNote(): ?string
    {
        return $this->returnNote;
    }

    public function getConditionAtStart(): ?Condition
    {
        return $this->conditionAtStart;
    }

    public function getConditionAtReturn(): ?Condition
    {
        return $this->conditionAtReturn;
    }

    public function getApprovalRequest(): ?ApprovalRequest
    {
        return $this->approvalRequest;
    }

    /** @return Collection<int, LoanEvent> */
    public function getEvents(): Collection
    {
        return $this->events;
    }
}
