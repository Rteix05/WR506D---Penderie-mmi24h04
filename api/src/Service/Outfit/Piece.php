<?php

namespace App\Service\Outfit;

/**
 * Un vêtement tel que le moteur le lit, sans Doctrine : de quoi le
 * classer et l'expliquer. WardrobeLoader le construit depuis Garment.
 */
final class Piece
{
    /**
     * @param list<string> $colorFamilies  BLACK, BLUE… (ColorFamily)
     * @param list<string> $colorIds
     * @param list<string> $styleIds
     * @param list<string> $styleNames
     */
    public function __construct(
        public readonly string $id,
        public readonly string $name,
        public readonly string $slot,
        public readonly string $categorySlug,
        public readonly string $categoryName,
        public readonly int $warmth,
        public readonly bool $waterResistant,
        public readonly string $usage,
        public readonly array $colorFamilies = [],
        public readonly array $colorIds = [],
        public readonly array $styleIds = [],
        public readonly array $styleNames = [],
        public readonly ?int $daysSinceWorn = null,
        public readonly bool $recentlySuggested = false,
    ) {
    }
}
