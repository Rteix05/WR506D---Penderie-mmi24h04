<?php

namespace App\Entity\Moderation;

use App\Entity\Identity\Account;
use App\Entity\Notification\Report;
use App\Entity\Sale\Dispute;
use App\Enum\Moderation\AiReviewStatus;
use App\Repository\Moderation\AiReviewRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Une pré-analyse de l'IA sur un signalement ou un litige, et ce qu'il en
 * est advenu. C'est le journal des décisions de l'IA : une ligne par
 * analyse, réussie ou non, jamais supprimée.
 *
 * On garde tout ce qu'il faut pour relire la décision après coup : le
 * dossier exact envoyé au modèle (input), la version de la consigne, le
 * modèle qui a répondu et ceux qui ont échoué, la durée, la réponse brute,
 * puis le verdict normalisé (verdict, sanction, confiance, résumé,
 * justification), ce qui a été appliqué, et l'administrateur qui a
 * confirmé, contredit ou annulé.
 *
 * Exactement l'un de report et dispute est renseigné (CHECK en base).
 */
#[ORM\Entity(repositoryClass: AiReviewRepository::class)]
#[ORM\Index(name: 'idx_ai_review_status_created', columns: ['status', 'created_at'])]
class AiReview
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Report::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Report $report;

    #[ORM\ManyToOne(targetEntity: Dispute::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Dispute $dispute;

    #[ORM\Column(length: 20, enumType: AiReviewStatus::class)]
    private AiReviewStatus $status;

    /** Signalement : DISMISS · WARN · SANCTION · UNSURE ; litige : BUYER · SELLER · NONE · UNSURE. */
    #[ORM\Column(length: 20, nullable: true)]
    private ?string $verdict = null;

    /** Pour SANCTION : HIDE (masquer le contenu) ou SUSPEND (suspendre l'auteur). */
    #[ORM\Column(length: 20, nullable: true)]
    private ?string $sanction = null;

    /** 0 à 100, telle que le modèle l'annonce. */
    #[ORM\Column(type: Types::SMALLINT, nullable: true)]
    private ?int $confidence = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $summary = null;

    /** @var list<string> les raisons, une par point */
    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true])]
    private array $justification = [];

    /** @var list<string> les faits du dossier sur lesquels le verdict s'appuie */
    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true])]
    private array $evidence = [];

    /** Le message proposé pour l'utilisateur concerné (avertissement, décision). */
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $message = null;

    /** Pourquoi la décision n'a pas été appliquée seule (seuil, décision réservée, dossier suspect…). */
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $heldBecause = null;

    /** Ce que l'IA a fait elle-même (dismiss, warn, hide, suspend). */
    #[ORM\Column(length: 20, nullable: true)]
    private ?string $appliedAction = null;

    #[ORM\Column(length: 120, nullable: true)]
    private ?string $model = null;

    /** @var list<array<string, mixed>> les modèles qui ont échoué avant (modèle, erreur, code HTTP, ms) */
    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true])]
    private array $attempts = [];

    #[ORM\Column]
    private int $durationMs = 0;

    #[ORM\Column(length: 20)]
    private string $promptVersion;

    /** @var array<string, mixed> le dossier exact envoyé au modèle */
    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true])]
    private array $input;

    /** @var array<string, mixed>|null la réponse brute du modèle */
    #[ORM\Column(type: Types::JSON, nullable: true, options: ['jsonb' => true])]
    private ?array $answer = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $error = null;

    /** L'administrateur qui a lancé l'analyse ; null pour la commande planifiée. */
    #[ORM\ManyToOne(targetEntity: Account::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Account $requestedBy;

    #[ORM\ManyToOne(targetEntity: Account::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Account $reviewedBy = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $reviewedAt = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $reviewNote = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    /** @param array<string, mixed> $input */
    public function __construct(Report|Dispute $subject, string $promptVersion, array $input, ?Account $requestedBy = null)
    {
        $this->id = Uuid::v7();
        $this->report = $subject instanceof Report ? $subject : null;
        $this->dispute = $subject instanceof Dispute ? $subject : null;
        $this->status = AiReviewStatus::Failed;
        $this->promptVersion = $promptVersion;
        $this->input = $input;
        $this->requestedBy = $requestedBy;
        $this->createdAt = new \DateTimeImmutable();
    }

    /**
     * @param list<array<string, mixed>> $attempts
     * @param array<string, mixed>|null  $answer
     */
    public function recordCall(?string $model, array $attempts, int $durationMs, ?array $answer, ?string $error): static
    {
        $this->model = $model;
        $this->attempts = $attempts;
        $this->durationMs = $durationMs;
        $this->answer = $answer;
        $this->error = $error;

        return $this;
    }

    /**
     * @param list<string> $justification
     * @param list<string> $evidence
     */
    public function recordVerdict(string $verdict, ?string $sanction, int $confidence, string $summary, array $justification, array $evidence, ?string $message): static
    {
        $this->verdict = $verdict;
        $this->sanction = $sanction;
        $this->confidence = max(0, min(100, $confidence));
        $this->summary = $summary;
        $this->justification = $justification;
        $this->evidence = $evidence;
        $this->message = $message;

        return $this;
    }

    public function markApplied(string $action): static
    {
        $this->status = AiReviewStatus::Applied;
        $this->appliedAction = $action;
        $this->heldBecause = null;

        return $this;
    }

    public function markProposed(string $heldBecause): static
    {
        $this->status = AiReviewStatus::Proposed;
        $this->heldBecause = $heldBecause;

        return $this;
    }

    public function markFailed(string $error): static
    {
        $this->status = AiReviewStatus::Failed;
        $this->error = $error;

        return $this;
    }

    /** L'administrateur a tranché lui-même : comme l'IA (CONFIRMED) ou autrement (OVERRIDDEN). */
    public function settle(Account $admin, bool $agrees, string $note): static
    {
        $this->assertOpen();
        $this->status = $agrees ? AiReviewStatus::Confirmed : AiReviewStatus::Overridden;

        return $this->review($admin, $note);
    }

    /** L'administrateur annule ce que l'IA avait appliqué. */
    public function revert(Account $admin, string $note): static
    {
        if (AiReviewStatus::Applied !== $this->status) {
            throw new \LogicException('Seule une décision appliquée par l\'IA s\'annule.');
        }
        $this->status = AiReviewStatus::Reverted;

        return $this->review($admin, $note);
    }

    private function review(Account $admin, string $note): static
    {
        if (!$admin->isAdmin() || $admin->isSystem()) {
            throw new \LogicException('Seul un administrateur relit une décision de l\'IA.');
        }
        $this->reviewedBy = $admin;
        $this->reviewedAt = new \DateTimeImmutable();
        $this->reviewNote = '' === trim($note) ? null : trim($note);

        return $this;
    }

    private function assertOpen(): void
    {
        if (!$this->status->isOpen()) {
            throw new \LogicException('Cette analyse est déjà close.');
        }
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getReport(): ?Report
    {
        return $this->report;
    }

    public function getDispute(): ?Dispute
    {
        return $this->dispute;
    }

    public function isAboutReport(): bool
    {
        return null !== $this->report;
    }

    public function getStatus(): AiReviewStatus
    {
        return $this->status;
    }

    public function getVerdict(): ?string
    {
        return $this->verdict;
    }

    public function getSanction(): ?string
    {
        return $this->sanction;
    }

    /** La décision proposée, telle que ReportDesk la nomme (dismiss, warn, hide, suspend), ou null. */
    public function getDecision(): ?string
    {
        return match ($this->verdict) {
            'DISMISS' => 'dismiss',
            'WARN' => 'warn',
            'SANCTION' => 'SUSPEND' === $this->sanction ? 'suspend' : 'hide',
            'BUYER' => 'buyer',
            'SELLER' => 'seller',
            'NONE' => 'none',
            default => null,
        };
    }

    public function getConfidence(): ?int
    {
        return $this->confidence;
    }

    public function getSummary(): ?string
    {
        return $this->summary;
    }

    /** @return list<string> */
    public function getJustification(): array
    {
        return $this->justification;
    }

    /** @return list<string> */
    public function getEvidence(): array
    {
        return $this->evidence;
    }

    public function getMessage(): ?string
    {
        return $this->message;
    }

    public function getHeldBecause(): ?string
    {
        return $this->heldBecause;
    }

    public function getAppliedAction(): ?string
    {
        return $this->appliedAction;
    }

    public function getModel(): ?string
    {
        return $this->model;
    }

    /** @return list<array<string, mixed>> */
    public function getAttempts(): array
    {
        return $this->attempts;
    }

    public function getDurationMs(): int
    {
        return $this->durationMs;
    }

    public function getPromptVersion(): string
    {
        return $this->promptVersion;
    }

    /** @return array<string, mixed> */
    public function getInput(): array
    {
        return $this->input;
    }

    /** @return array<string, mixed>|null */
    public function getAnswer(): ?array
    {
        return $this->answer;
    }

    public function getError(): ?string
    {
        return $this->error;
    }

    public function getRequestedBy(): ?Account
    {
        return $this->requestedBy;
    }

    public function getReviewedBy(): ?Account
    {
        return $this->reviewedBy;
    }

    public function getReviewedAt(): ?\DateTimeImmutable
    {
        return $this->reviewedAt;
    }

    public function getReviewNote(): ?string
    {
        return $this->reviewNote;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
