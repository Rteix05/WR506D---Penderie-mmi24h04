<?php

namespace App\Entity\Notification;

use App\Entity\Identity\Account;
use App\Entity\Identity\Profile;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Notification\ModerationTargetType;
use App\Enum\Notification\ReportReason;
use App\Enum\Notification\ReportStatus;
use App\Repository\Notification\ReportRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Un signalement (MDD, Report — V2, entré le 10/11 avec son écran du
 * back-office). Il enregistre qui signale quoi, pourquoi, quand, quel
 * administrateur a traité et ce qu'il a décidé ; l'action elle-même est une
 * ModerationAction qui pointe vers lui.
 *
 * La cible est une référence souple (targetType + targetId, sans clé
 * étrangère) : le contenu signalé peut être supprimé, le signalement doit
 * survivre. Un compte n'est pas une cible (on signale un profil).
 */
#[ORM\Entity(repositoryClass: ReportRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_report_status_created', columns: ['status', 'created_at'])]
#[ORM\Index(name: 'idx_report_target', columns: ['target_type', 'target_id'])]
class Report
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    /** RESTRICT : réaffecté au profil fantôme à la suppression du profil. */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Profile $reporter;

    #[ORM\Column(length: 20, enumType: ModerationTargetType::class)]
    private ModerationTargetType $targetType;

    #[ORM\Column(type: UuidType::NAME)]
    private Uuid $targetId;

    #[ORM\Column(length: 20, enumType: ReportReason::class)]
    private ReportReason $reason;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description;

    #[ORM\Column(length: 20, enumType: ReportStatus::class)]
    private ReportStatus $status = ReportStatus::Open;

    #[ORM\ManyToOne(targetEntity: Account::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Account $handledBy = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $handledAt = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $resolution = null;

    public function __construct(Profile $reporter, ModerationTargetType $targetType, Uuid $targetId, ReportReason $reason, ?string $description = null)
    {
        if (ModerationTargetType::Account === $targetType) {
            throw new \LogicException('On signale un profil, pas un compte.');
        }
        if (null !== $description && mb_strlen($description) > 1000) {
            throw new \LogicException('La description fait 1 000 caractères au plus.');
        }
        $this->id = Uuid::v7();
        $this->reporter = $reporter;
        $this->targetType = $targetType;
        $this->targetId = $targetId;
        $this->reason = $reason;
        $this->description = null === $description || '' === trim($description) ? null : trim($description);
    }

    /** Un administrateur le prend : il passe « en cours », à son nom. */
    public function takeInCharge(Account $admin): static
    {
        $this->assertPending($admin);
        $this->status = ReportStatus::UnderReview;
        $this->handledBy = $admin;

        return $this;
    }

    /** Traité par une action de modération (masquage, avertissement, suspension). */
    public function markActioned(Account $admin, string $resolution): static
    {
        return $this->close($admin, ReportStatus::Actioned, $resolution);
    }

    /** Classé sans suite : le contenu reste. */
    public function dismiss(Account $admin, string $resolution): static
    {
        return $this->close($admin, ReportStatus::Dismissed, $resolution);
    }

    private function close(Account $admin, ReportStatus $status, string $resolution): static
    {
        $this->assertPending($admin);
        $this->status = $status;
        $this->handledBy = $admin;
        $this->handledAt = new \DateTimeImmutable();
        $this->resolution = $resolution;

        return $this;
    }

    private function assertPending(Account $admin): void
    {
        if (!$admin->isAdmin()) {
            throw new \LogicException('Seul un administrateur traite un signalement.');
        }
        if (!$this->status->isPending()) {
            throw new \LogicException('Ce signalement est déjà traité.');
        }
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getReporter(): Profile
    {
        return $this->reporter;
    }

    public function getTargetType(): ModerationTargetType
    {
        return $this->targetType;
    }

    public function getTargetId(): Uuid
    {
        return $this->targetId;
    }

    public function getReason(): ReportReason
    {
        return $this->reason;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function getStatus(): ReportStatus
    {
        return $this->status;
    }

    public function getHandledBy(): ?Account
    {
        return $this->handledBy;
    }

    public function getHandledAt(): ?\DateTimeImmutable
    {
        return $this->handledAt;
    }

    public function getResolution(): ?string
    {
        return $this->resolution;
    }
}
