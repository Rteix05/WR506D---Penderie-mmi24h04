<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use App\Repository\Sharing\ShareRecipientRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Le destinataire nommé d'un partage SPECIFIC. Créé par Share::addRecipient,
 * qui refuse les autres audiences.
 */
#[ORM\Entity(repositoryClass: ShareRecipientRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_share_recipient', columns: ['share_id', 'profile_id'])]
#[ORM\Index(name: 'idx_share_recipient_profile', columns: ['profile_id'])]
class ShareRecipient
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Share::class, inversedBy: 'recipients')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Share $share;

    /** CASCADE : un destinataire supprimé n'a plus rien à voir. */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $profile;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $addedAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $lastViewedAt = null;

    /** @internal Passer par Share::addRecipient(). */
    public function __construct(Share $share, Profile $profile)
    {
        $this->id = Uuid::v7();
        $this->share = $share;
        $this->profile = $profile;
        $this->addedAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getShare(): Share
    {
        return $this->share;
    }

    public function getProfile(): Profile
    {
        return $this->profile;
    }

    public function getAddedAt(): \DateTimeImmutable
    {
        return $this->addedAt;
    }

    public function getLastViewedAt(): ?\DateTimeImmutable
    {
        return $this->lastViewedAt;
    }

    public function markViewed(): static
    {
        $this->lastViewedAt = new \DateTimeImmutable();

        return $this;
    }
}
