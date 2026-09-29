<?php

namespace App\Entity\Identity;

use App\Entity\Trait\TimestampableTrait;
use App\Enum\Identity\ApprovalStatus;
use App\Enum\Identity\ApprovalSubjectType;
use App\Enum\Identity\Permission;
use App\Repository\Identity\ApprovalRequestRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Une action tentée par un profil dont la permission est en mode
 * REQUIRES_APPROVAL. Le tuteur accepte ou refuse ; l'action n'est rejouée
 * (depuis payload) qu'après accord.
 *
 * L'approbateur n'est jamais choisi par l'appelant : le constructeur le
 * résout depuis requester.guardian, et il n'a pas de setter.
 */
#[ORM\Entity(repositoryClass: ApprovalRequestRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_approval_request_approver_status', columns: ['approver_id', 'status'])]
#[ORM\Index(name: 'idx_approval_request_requester', columns: ['requester_id'])]
class ApprovalRequest
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    /** L'enfant qui demande. */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $requester;

    /** Son tuteur, résolu automatiquement. */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Profile $approver;

    #[ORM\Column(length: 30, enumType: Permission::class)]
    private Permission $permission;

    #[ORM\Column(length: 20, nullable: true, enumType: ApprovalSubjectType::class)]
    private ?ApprovalSubjectType $subjectType;

    #[ORM\Column(type: UuidType::NAME, nullable: true)]
    private ?Uuid $subjectId;

    /**
     * De quoi rejouer l'action à l'acceptation.
     *
     * @var array<string, mixed>
     */
    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true])]
    private array $payload;

    #[ORM\Column(length: 20, enumType: ApprovalStatus::class)]
    private ApprovalStatus $status = ApprovalStatus::Pending;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $decidedAt = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $decisionNote = null;

    /** @param array<string, mixed> $payload */
    public function __construct(
        Profile $requester,
        Permission $permission,
        array $payload = [],
        ?ApprovalSubjectType $subjectType = null,
        ?Uuid $subjectId = null,
    ) {
        $guardian = $requester->getGuardian()
            ?? throw new \LogicException('Une demande d\'autorisation exige un profil sous tutelle.');

        $this->id = Uuid::v7();
        $this->requester = $requester;
        $this->approver = $guardian;
        $this->permission = $permission;
        $this->payload = $payload;
        $this->subjectType = $subjectType;
        $this->subjectId = $subjectId;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getRequester(): Profile
    {
        return $this->requester;
    }

    public function getApprover(): Profile
    {
        return $this->approver;
    }

    public function getPermission(): Permission
    {
        return $this->permission;
    }

    public function getSubjectType(): ?ApprovalSubjectType
    {
        return $this->subjectType;
    }

    public function getSubjectId(): ?Uuid
    {
        return $this->subjectId;
    }

    /** @return array<string, mixed> */
    public function getPayload(): array
    {
        return $this->payload;
    }

    public function getStatus(): ApprovalStatus
    {
        return $this->status;
    }

    public function getDecidedAt(): ?\DateTimeImmutable
    {
        return $this->decidedAt;
    }

    public function getDecisionNote(): ?string
    {
        return $this->decisionNote;
    }

    public function approve(?string $note = null): static
    {
        return $this->decide(ApprovalStatus::Approved, $note);
    }

    public function reject(?string $note = null): static
    {
        return $this->decide(ApprovalStatus::Rejected, $note);
    }

    public function withdraw(): static
    {
        return $this->decide(ApprovalStatus::Withdrawn);
    }

    public function expire(): static
    {
        return $this->decide(ApprovalStatus::Expired);
    }

    /** Une demande ne change d'état qu'une fois : PENDING → état final. */
    private function decide(ApprovalStatus $status, ?string $note = null): static
    {
        if ($this->status->isFinal()) {
            throw new \LogicException(\sprintf('La demande est déjà close (%s).', $this->status->value));
        }

        $this->status = $status;
        $this->decidedAt = new \DateTimeImmutable();
        $this->decisionNote = $note;

        return $this;
    }
}
