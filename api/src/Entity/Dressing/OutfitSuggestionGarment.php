<?php

namespace App\Entity\Dressing;

use App\Entity\Inventory\Garment;
use App\Repository\Dressing\OutfitSuggestionGarmentRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Une pièce proposée par une suggestion. wasReplaced garde la trace d'une
 * pièce que l'utilisateur a remplacée : le moteur apprend de ce refus.
 */
#[ORM\Entity(repositoryClass: OutfitSuggestionGarmentRepository::class)]
class OutfitSuggestionGarment
{
    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: OutfitSuggestion::class, inversedBy: 'pieces')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private OutfitSuggestion $suggestion;

    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Garment::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Garment $garment;

    #[ORM\Column]
    private int $position;

    #[ORM\Column]
    private bool $wasReplaced = false;

    /** @internal Par OutfitSuggestion. */
    public function __construct(OutfitSuggestion $suggestion, Garment $garment, int $position)
    {
        $this->suggestion = $suggestion;
        $this->garment = $garment;
        $this->position = $position;
    }

    /** @internal Par OutfitSuggestion::swapGarment(). */
    public function markReplaced(): void
    {
        $this->wasReplaced = true;
    }

    public function getSuggestion(): OutfitSuggestion
    {
        return $this->suggestion;
    }

    public function getGarment(): Garment
    {
        return $this->garment;
    }

    public function getPosition(): int
    {
        return $this->position;
    }

    public function wasReplaced(): bool
    {
        return $this->wasReplaced;
    }
}
