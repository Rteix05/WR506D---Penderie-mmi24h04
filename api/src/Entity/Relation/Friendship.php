<?php

namespace App\Entity\Relation;

use App\Entity\Identity\ApprovalRequest;
use App\Entity\Identity\Profile;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Relation\FriendshipStatus;
use App\Repository\Relation\FriendshipRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * L'amitié réciproque, avec son cycle de demande.
 *
 * Une seule ligne par paire, quel que soit le sens : l'index unique sur
 * (least, greatest) est posé par la migration, Doctrine ne sachant pas
 * déclarer un index sur expression. Conséquence : après un refus, une
 * nouvelle demande réutilise la ligne (requestAgain) au lieu d'en créer
 * une seconde.
 *
 * L'amitié n'ouvre aucun accès au contenu : seul un Share le fait.
 */
#[ORM\Entity(repositoryClass: FriendshipRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_friendship_addressee_status', columns: ['addressee_id', 'status'])]
#[ORM\Index(name: 'idx_friendship_requester_status', columns: ['requester_id', 'status'])]
class Friendship
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $requester;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $addressee;

    #[ORM\Column(length: 20, enumType: FriendshipStatus::class)]
    private FriendshipStatus $status = FriendshipStatus::Pending;

    /**
     * L'accord parental, quand un profil enfant est en jeu et que sa
     * permission FRIEND_ADD est en mode REQUIRES_APPROVAL. Tant qu'il n'est
     * pas APPROVED, la demande n'est pas présentée à l'autre profil.
     */
    #[ORM\ManyToOne(targetEntity: ApprovalRequest::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?ApprovalRequest $approvalRequest = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $requestedAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $respondedAt = null;

    public function __construct(Profile $requester, Profile $addressee, ?ApprovalRequest $approvalRequest = null)
    {
        self::assertDistinct($requester, $addressee);

        $this->id = Uuid::v7();
        $this->requester = $requester;
        $this->addressee = $addressee;
        $this->approvalRequest = $approvalRequest;
        $this->requestedAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getRequester(): Profile
    {
        return $this->requester;
    }

    public function getAddressee(): Profile
    {
        return $this->addressee;
    }

    public function involves(Profile $profile): bool
    {
        return $this->requester->getId()->equals($profile->getId())
            || $this->addressee->getId()->equals($profile->getId());
    }

    /** L'autre profil de la paire, vu depuis $profile. */
    public function getOther(Profile $profile): Profile
    {
        if (!$this->involves($profile)) {
            throw new \LogicException('Ce profil ne fait pas partie de cette amitié.');
        }

        return $this->requester->getId()->equals($profile->getId()) ? $this->addressee : $this->requester;
    }

    public function getStatus(): FriendshipStatus
    {
        return $this->status;
    }

    public function isAccepted(): bool
    {
        return FriendshipStatus::Accepted === $this->status;
    }

    public function getApprovalRequest(): ?ApprovalRequest
    {
        return $this->approvalRequest;
    }

    public function getRequestedAt(): \DateTimeImmutable
    {
        return $this->requestedAt;
    }

    public function getRespondedAt(): ?\DateTimeImmutable
    {
        return $this->respondedAt;
    }

    public function accept(): static
    {
        return $this->respond(FriendshipStatus::Accepted);
    }

    public function decline(): static
    {
        return $this->respond(FriendshipStatus::Declined);
    }

    /**
     * Nouvelle demande après un refus : la paire est unique, on réutilise
     * donc la ligne. Le demandeur peut être l'un ou l'autre des deux profils.
     */
    public function requestAgain(Profile $requester, ?ApprovalRequest $approvalRequest = null): static
    {
        if (FriendshipStatus::Declined !== $this->status) {
            throw new \LogicException('Seule une demande refusée peut être renouvelée.');
        }

        $addressee = $this->getOther($requester);
        $this->requester = $requester;
        $this->addressee = $addressee;
        $this->status = FriendshipStatus::Pending;
        $this->approvalRequest = $approvalRequest;
        $this->requestedAt = new \DateTimeImmutable();
        $this->respondedAt = null;

        return $this;
    }

    private function respond(FriendshipStatus $status): static
    {
        if (FriendshipStatus::Pending !== $this->status) {
            throw new \LogicException(\sprintf('Cette demande a déjà reçu une réponse (%s).', $this->status->value));
        }

        $this->status = $status;
        $this->respondedAt = new \DateTimeImmutable();

        return $this;
    }

    private static function assertDistinct(Profile $a, Profile $b): void
    {
        if ($a === $b || $a->getId()->equals($b->getId())) {
            throw new \LogicException('Un profil ne peut pas être ami avec lui-même.');
        }
        if ($a->isGhost() || $b->isGhost()) {
            throw new \LogicException('Le profil fantôme n\'a pas de relations.');
        }
    }
}
