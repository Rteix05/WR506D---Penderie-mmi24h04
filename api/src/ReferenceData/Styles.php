<?php

namespace App\ReferenceData;

/**
 * Les styles vestimentaires, tels que listés par le MDD.
 */
final class Styles
{
    /** @return array<string, string> slug => nom affiché */
    public static function all(): array
    {
        return [
            'casual' => 'Décontracté',
            'sport' => 'Sport',
            'work' => 'Travail',
            'evening' => 'Soirée',
            'chic' => 'Chic',
            'streetwear' => 'Streetwear',
        ];
    }
}
