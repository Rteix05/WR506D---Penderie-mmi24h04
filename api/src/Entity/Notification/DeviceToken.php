<?php

namespace App\Entity\Notification;

use App\Entity\Identity\Account;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Notification\DevicePlatform;
use App\Repository\Notification\DeviceTokenRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Un appareil à joindre par push. Le jeton appartient au COMPTE (c'est
 * l'appareil qui se connecte), alors qu'une notification vise un profil.
 * Un même appareil n'est enregistré qu'une fois (token unique) : s'il
 * change de compte, register() le réattribue.
 */
#[ORM\Entity(repositoryClass: DeviceTokenRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_device_token_account', columns: ['account_id'])]
class DeviceToken
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Account::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Account $account;

    /** Le jeton Expo Push / FCM / APNs. */
    #[ORM\Column(length: 255, unique: true)]
    private string $token;

    #[ORM\Column(length: 10, enumType: DevicePlatform::class)]
    private DevicePlatform $platform;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $lastSeenAt;

    public function __construct(Account $account, string $token, DevicePlatform $platform)
    {
        if ($account->isGhost()) {
            throw new \LogicException('Le compte fantôme n\'a pas d\'appareil.');
        }
        $this->id = Uuid::v7();
        $this->account = $account;
        $this->token = $token;
        $this->platform = $platform;
        $this->lastSeenAt = new \DateTimeImmutable();
    }

    /** L'appareil se reconnecte, éventuellement sur un autre compte. */
    public function register(Account $account): static
    {
        $this->account = $account;
        $this->lastSeenAt = new \DateTimeImmutable();

        return $this;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getAccount(): Account
    {
        return $this->account;
    }

    public function getToken(): string
    {
        return $this->token;
    }

    public function getPlatform(): DevicePlatform
    {
        return $this->platform;
    }

    public function getLastSeenAt(): \DateTimeImmutable
    {
        return $this->lastSeenAt;
    }
}
