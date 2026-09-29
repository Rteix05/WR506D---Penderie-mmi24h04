<?php

namespace App\Entity\Reference;

use App\Repository\Reference\ItemCategoryRepository;
use App\Validator\Reference\ValidCategoryTree;
use Doctrine\ORM\Mapping as ORM;

/**
 * Catégorie d'objet (électroménager, outillage, livres…), arborescente.
 */
#[ORM\Entity(repositoryClass: ItemCategoryRepository::class)]
#[ORM\Index(name: 'idx_item_category_parent', columns: ['parent_id'])]
#[ORM\UniqueConstraint(name: 'uniq_item_category_system_slug', columns: ['slug'], options: ['where' => '(owner_id IS NULL)'])]
#[ORM\UniqueConstraint(name: 'uniq_item_category_owner_slug', columns: ['owner_id', 'slug'], options: ['where' => '(owner_id IS NOT NULL)'])]
#[ValidCategoryTree]
class ItemCategory extends AbstractCategory
{
    #[ORM\ManyToOne(targetEntity: self::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'RESTRICT')]
    private ?ItemCategory $parent = null;

    public function getParent(): ?static
    {
        return $this->parent;
    }

    public function setParent(?ItemCategory $parent): static
    {
        $this->parent = $parent;

        return $this;
    }
}
