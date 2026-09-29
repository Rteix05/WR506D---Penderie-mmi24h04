<?php

namespace App\ReferenceData;

use App\Enum\Reference\ColorFamily as F;

/**
 * Les couleurs de vêtement proposées, regroupées par famille.
 */
final class Colors
{
    /** @return list<array{name: string, hex: ?string, family: F}> */
    public static function all(): array
    {
        return array_map(
            static fn (array $c) => ['name' => $c[0], 'hex' => $c[1], 'family' => $c[2]],
            [
                ['Noir', '#000000', F::Black],
                ['Blanc', '#FFFFFF', F::White],
                ['Écru', '#F3EFE0', F::White],
                ['Gris clair', '#D3D3D3', F::Grey],
                ['Gris', '#808080', F::Grey],
                ['Anthracite', '#3A3A3A', F::Grey],
                ['Beige', '#D8C3A5', F::Beige],
                ['Camel', '#C19A6B', F::Beige],
                ['Marron', '#6F4E37', F::Brown],
                ['Bordeaux', '#6D071A', F::Red],
                ['Rouge', '#D0312D', F::Red],
                ['Rose poudré', '#F4C2C2', F::Pink],
                ['Rose', '#F4A6B8', F::Pink],
                ['Fuchsia', '#D1348B', F::Pink],
                ['Corail', '#F88379', F::Orange],
                ['Orange', '#F28C28', F::Orange],
                ['Moutarde', '#C9A227', F::Yellow],
                ['Jaune', '#F4D03F', F::Yellow],
                ['Kaki', '#7C7B4F', F::Green],
                ['Vert', '#2E8B57', F::Green],
                ['Vert d\'eau', '#A8D8C8', F::Green],
                ['Turquoise', '#30B7B0', F::Blue],
                ['Bleu ciel', '#87CEEB', F::Blue],
                ['Bleu', '#1F5FBF', F::Blue],
                ['Bleu marine', '#1B2A4A', F::Blue],
                ['Lavande', '#B8A9D9', F::Purple],
                ['Violet', '#7D3C98', F::Purple],
                ['Doré', '#C9A43A', F::Metallic],
                ['Argenté', '#C0C0C0', F::Metallic],
                ['Multicolore', null, F::Multi],
            ],
        );
    }
}
