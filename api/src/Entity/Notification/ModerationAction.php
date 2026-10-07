<?php

namespace App\Entity\Notification;

use App\Entity\Identity\Account;
use App\Enum\Notification\ModerationActionType as A;
use App\Enum\Notification\ModerationTargetType as T;
use App\Repository\Notification\ModerationActionRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Ce que l'administrateur a fait, et pourquoi. Existe sans signalement
 * préalable : MVP depuis le 29/09, alors que Report reste en V2. La clé
 * report du MDD arrivera avec Report (une colonne sans sa table ne pourrait
 * pas avoir de vraie clé étrangère).
 *
 * La cible est une référence souple (targetType + targetId, sans clé
 * étrangère, comme Report) : le contenu supprimé par la modération ne doit
 * pas effacer la trace de sa suppression.
 *
 * Journal en écriture seule : pas de setter, et le déclencheur de garde
 * penderie_append_only() en base (seul admin_id reste modifiable, pour la
 * réaffectation au compte fantôme). Appliquer l'action (masquer le
 * commentaire, suspendre le profil) est le rôle du service de modération ;
 * annuler, c'est écrire une action RESTORE.
 */
#[ORM\Entity(repositoryClass: ModerationActionRepository::class)]
#[ORM\Index(name: 'idx_moderation_action_target', columns: ['target_type', 'target_id'])]
#[ORM\Index(name: 'idx_moderation_action_admin', columns: ['admin_id', 'created_at'])]
class ModerationAction
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Account::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Account $admin;

    #[ORM\Column(length: 30, enumType: A::class)]
    private A $actionType;

    #[ORM\Column(length: 20, enumType: T::class)]
    private T $targetType;

    #[ORM\Column(type: UuidType::NAME)]
    private Uuid $targetId;

    #[ORM\Column(type: Types::TEXT)]
    #[Assert\NotBlank]
    private string $reason;

    /** Fin d'une suspension ou d'un bannissement temporaire. */
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $expiresAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(Account $admin, A $actionType, T $targetType, Uuid $targetId, string $reason, ?\DateTimeImmutable $expiresAt = null)
    {
        if (!$admin->isAdmin()) {
            throw new \LogicException('Seul un administrateur modère.');
        }
        self::assertCompatible($actionType, $targetType);
        if (null !== $expiresAt && (!$actionType->canExpire() || $expiresAt <= new \DateTimeImmutable())) {
            throw new \LogicException('Seule une suspension ou un bannissement expire, et dans le futur.');
        }
        $this->id = Uuid::v7();
        $this->admin = $admin;
        $this->actionType = $actionType;
        $this->targetType = $targetType;
        $this->targetId = $targetId;
        $this->reason = $reason;
        $this->expiresAt = $expiresAt;
        $this->createdAt = new \DateTimeImmutable();
    }

    /**
     * L'action correspond à sa cible : on suspend ou on avertit un profil,
     * on bannit un compte, on masque ou supprime un contenu. RESTORE vise
     * n'importe quoi. Doublé d'un CHECK en base.
     */
    private static function assertCompatible(A $action, T $target): void
    {
        $ok = match ($action) {
            A::SuspendProfile, A::Warn => T::Profile === $target,
            A::BanAccount => T::Account === $target,
            A::HideContent, A::DeleteContent => $target->isContent(),
            A::Restore => true,
        };
        if (!$ok) {
            throw new \LogicException(\sprintf('L\'action %s ne s\'applique pas à une cible %s.', $action->value, $target->value));
        }
    }

    public function isInForce(?\DateTimeImmutable $at = null): bool
    {
        return null === $this->expiresAt || $this->expiresAt > ($at ?? new \DateTimeImmutable());
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getAdmin(): Account
    {
        return $this->admin;
    }

    public function getActionType(): A
    {
        return $this->actionType;
    }

    public function getTargetType(): T
    {
        return $this->targetType;
    }

    public function getTargetId(): Uuid
    {
        return $this->targetId;
    }

    public function getReason(): string
    {
        return $this->reason;
    }

    public function getExpiresAt(): ?\DateTimeImmutable
    {
        return $this->expiresAt;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
