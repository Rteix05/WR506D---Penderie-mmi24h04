<?php

namespace App\Service\Outfit;

/**
 * Une tenue composée par le moteur : ses pièces, sa note, et l'accord de
 * ses couleurs (neutral, oneAccent, contrast, busy).
 */
final class OutfitCandidate
{
    /** L'ordre d'affichage : la couche du dessus en grand, puis haut, bas, robe, chaussures, accessoire. */
    private const ORDER = ['outer' => 0, 'top' => 1, 'dress' => 1, 'bottom' => 2, 'shoes' => 3, 'warmAccessory' => 4];

    /** @var list<Piece> */
    public readonly array $pieces;

    /** @param list<Piece> $pieces */
    public function __construct(array $pieces, public readonly float $score, public readonly string $harmony)
    {
        usort($pieces, static fn (Piece $a, Piece $b) => (self::ORDER[$a->slot] ?? 9) <=> (self::ORDER[$b->slot] ?? 9));
        $this->pieces = $pieces;
    }

    /** @return list<string> les pièces principales (haut, bas, robe), triées : ce qui distingue deux tenues */
    public function mainIds(): array
    {
        $ids = array_map(static fn (Piece $p) => $p->id, array_values(array_filter($this->pieces, static fn (Piece $p) => \in_array($p->slot, ['top', 'bottom', 'dress'], true))));
        sort($ids);

        return $ids;
    }

    public function slot(string $slot): ?Piece
    {
        foreach ($this->pieces as $piece) {
            if ($piece->slot === $slot) {
                return $piece;
            }
        }

        return null;
    }
}
