<?php

namespace App\Entity\Notification;

use App\Entity\Identity\Profile;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Notification\NotificationType;
use App\Repository\Notification\NotificationRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Une notification, quel que soit l'événement : une seule entité pour les
 * dix-neuf types, plutôt qu'une entité par cas. data porte ce qu'il faut
 * pour ouvrir le bon contenu (type et identifiant de la cible).
 *
 * Elle vise un PROFIL ; l'envoi push résout profil → compte → appareils
 * (DeviceToken), en indiquant le profil visé dans la charge utile.
 */
#[ORM\Entity(repositoryClass: NotificationRepository::class)]
#[ORM\HasLifecycleCallbacks]
// L'écran Notifications et le compteur de non-lues (MDD, « Index importants »).
#[ORM\Index(name: 'idx_notification_recipient_read_created', columns: ['recipient_id', 'read_at', 'created_at'])]
class Notification
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    /** CASCADE : sans destinataire, plus rien à notifier (MDD). */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $recipient;

    /** Qui a déclenché l'événement ; nul s'il est automatique. */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Profile $actor;

    #[ORM\Column(length: 30, enumType: NotificationType::class)]
    private NotificationType $type;

    #[ORM\Column(length: 150)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 150)]
    private string $title;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $body;

    /** @var array<string, mixed> « targetType », « targetId »… */
    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true])]
    private array $data;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $readAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $pushSentAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $emailSentAt = null;

    /** @param array<string, mixed> $data */
    public function __construct(Profile $recipient, NotificationType $type, string $title, ?string $body = null, array $data = [], ?Profile $actor = null)
    {
        if (null !== $actor && $actor->getId()->equals($recipient->getId())) {
            throw new \LogicException('On ne se notifie pas soi-même.');
        }
        $this->id = Uuid::v7();
        $this->recipient = $recipient;
        $this->type = $type;
        $this->title = $title;
        $this->body = $body;
        $this->data = $data;
        $this->actor = $actor;
    }

    public function markRead(): static
    {
        $this->readAt ??= new \DateTimeImmutable();

        return $this;
    }

    public function isRead(): bool
    {
        return null !== $this->readAt;
    }

    public function markPushSent(): static
    {
        $this->pushSentAt ??= new \DateTimeImmutable();

        return $this;
    }

    public function markEmailSent(): static
    {
        $this->emailSentAt ??= new \DateTimeImmutable();

        return $this;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getRecipient(): Profile
    {
        return $this->recipient;
    }

    public function getActor(): ?Profile
    {
        return $this->actor;
    }

    public function getType(): NotificationType
    {
        return $this->type;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function getBody(): ?string
    {
        return $this->body;
    }

    /** @return array<string, mixed> */
    public function getData(): array
    {
        return $this->data;
    }

    public function getReadAt(): ?\DateTimeImmutable
    {
        return $this->readAt;
    }

    public function getPushSentAt(): ?\DateTimeImmutable
    {
        return $this->pushSentAt;
    }

    public function getEmailSentAt(): ?\DateTimeImmutable
    {
        return $this->emailSentAt;
    }
}
