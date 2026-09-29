<?php

namespace App\Entity\Dressing;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Reference\Color;
use App\Entity\Reference\GarmentCategory;
use App\Entity\Reference\Style;
use App\Repository\Dressing\GarmentVisibilityPreferenceRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Masquer des vêtements du dressing par critères combinables, en ET :
 * catégorie seule (toutes les chemises), couleur seule (tout ce qui est
 * noir), ou les deux (seulement les t-shirts noirs).
 *
 * Ce n'est pas une liste de pièces mais un filtre évalué à l'affichage
 * (matches()) : un vêtement ajouté demain qui correspond sera masqué sans
 * rien écrire. Réversible par reactivatedAt, l'historique reste.
 *
 * « Pas deux fois la même règle active » : index unique sur expression
 * posé par la migration (COALESCE, car deux NULL ne sont jamais égaux
 * pour un index unique ordinaire).
 */
#[ORM\Entity(repositoryClass: GarmentVisibilityPreferenceRepository::class)]
#[ORM\Index(name: 'idx_visibility_pref_profile', columns: ['profile_id'])]
class GarmentVisibilityPreference
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $profile;

    #[ORM\ManyToOne(targetEntity: GarmentCategory::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?GarmentCategory $garmentCategory;

    #[ORM\ManyToOne(targetEntity: Color::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Color $color;

    #[ORM\ManyToOne(targetEntity: Style::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Style $style;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $hiddenAt;

    /** Active tant que nul. */
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $reactivatedAt = null;

    public function __construct(Profile $profile, ?GarmentCategory $garmentCategory = null, ?Color $color = null, ?Style $style = null)
    {
        if (null === $garmentCategory && null === $color && null === $style) {
            throw new \LogicException('Une règle de masquage a au moins un critère.');
        }
        $this->id = Uuid::v7();
        $this->profile = $profile;
        $this->garmentCategory = $garmentCategory;
        $this->color = $color;
        $this->style = $style;
        $this->hiddenAt = new \DateTimeImmutable();
    }

    /**
     * Le vêtement est-il masqué par cette règle ? Critères en ET. La
     * catégorie couvre ses sous-catégories : masquer « Hauts » masque les
     * t-shirts.
     */
    public function matches(Garment $garment): bool
    {
        if (!$this->isActive()) {
            return false;
        }
        if (null !== $this->garmentCategory) {
            $inCategory = false;
            for ($c = $garment->getCategory(); null !== $c; $c = $c->getParent()) {
                if ($c->getId()->equals($this->garmentCategory->getId())) {
                    $inCategory = true;
                    break;
                }
            }
            if (!$inCategory) {
                return false;
            }
        }
        if (null !== $this->color && !$garment->getColors()->exists(fn ($k, Color $c) => $c->getId()->equals($this->color->getId()))) {
            return false;
        }
        if (null !== $this->style && !$garment->getStyles()->exists(fn ($k, Style $s) => $s->getId()->equals($this->style->getId()))) {
            return false;
        }

        return true;
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

    public function getGarmentCategory(): ?GarmentCategory
    {
        return $this->garmentCategory;
    }

    public function getColor(): ?Color
    {
        return $this->color;
    }

    public function getStyle(): ?Style
    {
        return $this->style;
    }

    public function getHiddenAt(): \DateTimeImmutable
    {
        return $this->hiddenAt;
    }

    public function getReactivatedAt(): ?\DateTimeImmutable
    {
        return $this->reactivatedAt;
    }
}
