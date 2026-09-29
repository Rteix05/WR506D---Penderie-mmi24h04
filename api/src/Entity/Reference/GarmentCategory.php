<?php

namespace App\Entity\Reference;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Enum\Reference\Warmth;
use App\Repository\Reference\GarmentCategoryRepository;
use App\Validator\Reference\ValidCategoryTree;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

/**
 * Catégorie de vêtement, arborescente. C'est elle qui déclare l'échelle de
 * tailles (sizeSystem) et la chaleur par défaut (defaultWarmth) de ses
 * vêtements. Une catégorie parente (« Hauts ») n'a en général ni l'une ni
 * l'autre : ce sont ses feuilles (« T-shirts ») qui les portent.
 */
#[ORM\Entity(repositoryClass: GarmentCategoryRepository::class)]
#[ORM\Index(name: 'idx_garment_category_parent', columns: ['parent_id'])]
#[ORM\UniqueConstraint(name: 'uniq_garment_category_system_slug', columns: ['slug'], options: ['where' => '(owner_id IS NULL)'])]
#[ORM\UniqueConstraint(name: 'uniq_garment_category_owner_slug', columns: ['owner_id', 'slug'], options: ['where' => '(owner_id IS NOT NULL)'])]
#[ValidCategoryTree]
#[ApiResource(
    shortName: 'GarmentCategory',
    operations: [
        new GetCollection(),
        new Get(),
    ],
    normalizationContext: ['groups' => ['category:read']],
)]
class GarmentCategory extends AbstractCategory
{
    #[ORM\ManyToOne(targetEntity: self::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'RESTRICT')]
    #[Groups(['category:read'])]
    private ?GarmentCategory $parent = null;

    #[ORM\ManyToOne(targetEntity: SizeSystem::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'RESTRICT')]
    #[Groups(['category:read'])]
    private ?SizeSystem $sizeSystem = null;

    #[ORM\Column(length: 20, nullable: true, enumType: Warmth::class)]
    #[Groups(['category:read'])]
    private ?Warmth $defaultWarmth = null;

    public function getParent(): ?static
    {
        return $this->parent;
    }

    public function setParent(?GarmentCategory $parent): static
    {
        $this->parent = $parent;

        return $this;
    }

    public function getSizeSystem(): ?SizeSystem
    {
        return $this->sizeSystem;
    }

    public function setSizeSystem(?SizeSystem $sizeSystem): static
    {
        $this->sizeSystem = $sizeSystem;

        return $this;
    }

    public function getDefaultWarmth(): ?Warmth
    {
        return $this->defaultWarmth;
    }

    public function setDefaultWarmth(?Warmth $defaultWarmth): static
    {
        $this->defaultWarmth = $defaultWarmth;

        return $this;
    }
}
