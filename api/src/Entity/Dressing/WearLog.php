<?php

namespace App\Entity\Dressing;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Repository\Dressing\WearLogRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Qui a porté quoi, et quand. La colonne profile (le porteur, pas le
 * propriétaire) rend l'historique juste dans un dressing familial ; le
 * moteur de suggestion s'en sert pour « porté récemment ».
 */
#[ORM\Entity(repositoryClass: WearLogRepository::class)]
#[ORM\Index(name: 'idx_wear_log_garment_worn', columns: ['garment_id', 'worn_at'])]
#[ORM\Index(name: 'idx_wear_log_profile_worn', columns: ['profile_id', 'worn_at'])]
// Une pièce n'est portée qu'une fois par jour et par personne.
#[ORM\UniqueConstraint(name: 'uniq_wear_log_day', columns: ['garment_id', 'profile_id', 'worn_at'])]
class WearLog
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Garment::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Garment $garment;

    /** Le porteur. CASCADE : supprimé avec son profil (MDD). */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $profile;

    #[ORM\ManyToOne(targetEntity: Outfit::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Outfit $outfit;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $wornAt;

    public function __construct(Garment $garment, Profile $wearer, ?\DateTimeImmutable $wornAt = null, ?Outfit $outfit = null)
    {
        $wornAt ??= new \DateTimeImmutable('today');
        if ($wornAt > new \DateTimeImmutable('today')) {
            throw new \LogicException('On ne note pas une tenue portée dans le futur.');
        }
        $this->id = Uuid::v7();
        $this->garment = $garment;
        $this->profile = $wearer;
        $this->outfit = $outfit;
        $this->wornAt = $wornAt;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getGarment(): Garment
    {
        return $this->garment;
    }

    public function getProfile(): Profile
    {
        return $this->profile;
    }

    public function getOutfit(): ?Outfit
    {
        return $this->outfit;
    }

    public function getWornAt(): \DateTimeImmutable
    {
        return $this->wornAt;
    }
}
