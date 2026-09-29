<?php

namespace App\Entity\Dressing;

use App\Entity\Identity\Profile;
use App\Entity\Reference\Style;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Dressing\Sentiment;
use App\Enum\Inventory\GarmentUsage;
use App\Repository\Dressing\StylePreferenceRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Uid\Uuid;

/**
 * Aimer ou ne pas aimer un style, éventuellement selon le contexte. Même
 * forme que ColorPreference : deux petites tables avec de vraies clés
 * étrangères plutôt qu'une table générique (MDD).
 */
#[ORM\Entity(repositoryClass: StylePreferenceRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_style_pref_profile', columns: ['profile_id'])]
#[UniqueEntity(fields: ['profile', 'style', 'context'], message: 'Cette préférence existe déjà : change son avis plutôt.', ignoreNull: false)]
class StylePreference
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $profile;

    #[ORM\ManyToOne(targetEntity: Style::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Style $style;

    #[ORM\Column(length: 10, enumType: Sentiment::class)]
    private Sentiment $sentiment;

    #[ORM\Column(length: 20, nullable: true, enumType: GarmentUsage::class)]
    private ?GarmentUsage $context;

    public function __construct(Profile $profile, Style $style, Sentiment $sentiment, ?GarmentUsage $context = null)
    {
        $this->id = Uuid::v7();
        $this->profile = $profile;
        $this->style = $style;
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

    public function getStyle(): Style
    {
        return $this->style;
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
