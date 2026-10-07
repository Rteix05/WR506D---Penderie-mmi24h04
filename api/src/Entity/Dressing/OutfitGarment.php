<?php

namespace App\Entity\Dressing;

use App\Entity\Inventory\Garment;
use App\Repository\Dressing\OutfitGarmentRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Une pièce d'une tenue. Clé primaire composite : la même pièce n'apparaît
 * qu'une fois dans une tenue.
 */
#[ORM\Entity(repositoryClass: OutfitGarmentRepository::class)]
class OutfitGarment
{
    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Outfit::class, inversedBy: 'pieces')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Outfit $outfit;

    /** CASCADE : un vêtement réellement supprimé quitte les tenues (il se supprime en douceur d'abord). */
    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Garment::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Garment $garment;

    #[ORM\Column]
    private int $position;

    /** @internal Par Outfit::addGarment(). */
    public function __construct(Outfit $outfit, Garment $garment, int $position)
    {
        $this->outfit = $outfit;
        $this->garment = $garment;
        $this->position = $position;
    }

    public function getOutfit(): Outfit
    {
        return $this->outfit;
    }

    public function getGarment(): Garment
    {
        return $this->garment;
    }

    public function getPosition(): int
    {
        return $this->position;
    }
}
