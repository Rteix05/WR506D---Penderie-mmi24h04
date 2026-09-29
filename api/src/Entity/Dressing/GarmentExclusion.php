<?php

namespace App\Entity\Dressing;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Repository\Dressing\GarmentExclusionRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Une pièce écartée des SUGGESTIONS (elle reste visible dans le dressing :
 * c'est GarmentVisibilityPreference qui masque). Jusqu'à réactivation
 * explicite, sans expiration ni perte d'historique : une seule exclusion
 * active à la fois (index unique partiel), les anciennes restent.
 */
#[ORM\Entity(repositoryClass: GarmentExclusionRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_garment_exclusion_active', columns: ['profile_id', 'garment_id'], options: ['where' => '(reactivated_at IS NULL)'])]
class GarmentExclusion
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $profile;

    #[ORM\ManyToOne(targetEntity: Garment::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Garment $garment;

    /** D'où venait le refus. */
    #[ORM\ManyToOne(targetEntity: OutfitSuggestion::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?OutfitSuggestion $fromSuggestion;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $reason;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $excludedAt;

    /** Active tant que nul. */
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $reactivatedAt = null;

    public function __construct(Profile $profile, Garment $garment, ?string $reason = null, ?OutfitSuggestion $fromSuggestion = null)
    {
        $this->id = Uuid::v7();
        $this->profile = $profile;
        $this->garment = $garment;
        $this->reason = $reason;
        $this->fromSuggestion = $fromSuggestion;
        $this->excludedAt = new \DateTimeImmutable();
    }

    public function reactivate(): static
    {
        $this->reactivatedAt ??= new \DateTimeImmutable();

        return $this;
    }

    public function isActive(): bool
    {
        return null === $this->reactivatedAt;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getProfile(): Profile
    {
        return $this->profile;
    }

    public function getGarment(): Garment
    {
        return $this->garment;
    }

    public function getFromSuggestion(): ?OutfitSuggestion
    {
        return $this->fromSuggestion;
    }

    public function getReason(): ?string
    {
        return $this->reason;
    }

    public function getExcludedAt(): \DateTimeImmutable
    {
        return $this->excludedAt;
    }

    public function getReactivatedAt(): ?\DateTimeImmutable
    {
        return $this->reactivatedAt;
    }
}
