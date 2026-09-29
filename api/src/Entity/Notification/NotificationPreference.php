<?php

namespace App\Entity\Notification;

use App\Entity\Identity\Profile;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Notification\NotificationType;
use App\Repository\Notification\NotificationPreferenceRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Uid\Uuid;

/**
 * Le réglage d'un type de notification pour un profil. Aucune ligne =
 * réglage par défaut (push activé, email désactivé) : comme pour les
 * permissions, on ne stocke que ce qui dévie.
 */
#[ORM\Entity(repositoryClass: NotificationPreferenceRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\UniqueConstraint(name: 'uniq_notification_preference', columns: ['profile_id', 'type'])]
#[UniqueEntity(fields: ['profile', 'type'], message: 'Ce type de notification est déjà réglé pour ce profil.')]
class NotificationPreference
{
    use TimestampableTrait;

    public const DEFAULT_PUSH = true;
    public const DEFAULT_EMAIL = false;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $profile;

    #[ORM\Column(length: 30, enumType: NotificationType::class)]
    private NotificationType $type;

    #[ORM\Column]
    private bool $pushEnabled;

    #[ORM\Column]
    private bool $emailEnabled;

    public function __construct(Profile $profile, NotificationType $type, bool $pushEnabled = self::DEFAULT_PUSH, bool $emailEnabled = self::DEFAULT_EMAIL)
    {
        $this->id = Uuid::v7();
        $this->profile = $profile;
        $this->type = $type;
        $this->pushEnabled = $pushEnabled;
        $this->emailEnabled = $emailEnabled;
    }

    public function update(bool $pushEnabled, bool $emailEnabled): static
    {
        $this->pushEnabled = $pushEnabled;
        $this->emailEnabled = $emailEnabled;

        return $this;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getProfile(): Profile
    {
        return $this->profile;
    }

    public function getType(): NotificationType
    {
        return $this->type;
    }

    public function isPushEnabled(): bool
    {
        return $this->pushEnabled;
    }

    public function isEmailEnabled(): bool
    {
        return $this->emailEnabled;
    }
}
