<?php

namespace App\Entity\Dressing;

use App\Entity\Identity\Profile;
use App\Entity\Reference\Color;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Dressing\Sentiment;
use App\Enum\Inventory\GarmentUsage;
use App\Repository\Dressing\ColorPreferenceRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Uid\Uuid;

/**
 * Aimer ou ne pas aimer une couleur, éventuellement selon le contexte
 * (nul = toujours). Changer d'avis : changeSentiment() ; annuler :
 * supprimer la ligne.
 *
 * Unique (profil, couleur, contexte), contexte nul compris : index sur
 * expression posé par la migration, et UniqueEntity avec ignoreNull à
 * faux pour un message clair.
 */
#[ORM\Entity(repositoryClass: ColorPreferenceRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_color_pref_profile', columns: ['profile_id'])]
#[UniqueEntity(fields: ['profile', 'color', 'context'], message: 'Cette préférence existe déjà : change son avis plutôt.', ignoreNull: false)]
class ColorPreference
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $profile;

    #[ORM\ManyToOne(targetEntity: Color::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Color $color;

    #[ORM\Column(length: 10, enumType: Sentiment::class)]
    private Sentiment $sentiment;

    #[ORM\Column(length: 20, nullable: true, enumType: GarmentUsage::class)]
    private ?GarmentUsage $context;

    public function __construct(Profile $profile, Color $color, Sentiment $sentiment, ?GarmentUsage $context = null)
    {
        $this->id = Uuid::v7();
        $this->profile = $profile;
        $this->color = $color;
        $this->sentiment = $sentiment;
        $this->context = $context;
    }

    public function changeSentiment(Sentiment $sentiment): static
    {
        $this->sentiment = $sentiment;

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

    public function getColor(): Color
    {
        return $this->color;
    }

    public function getSentiment(): Sentiment
    {
        return $this->sentiment;
    }

    public function getContext(): ?GarmentUsage
    {
        return $this->context;
    }
}
