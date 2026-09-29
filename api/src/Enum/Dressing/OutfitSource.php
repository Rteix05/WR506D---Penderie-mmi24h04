<?php

namespace App\Enum\Dressing;

/**
 * D'où vient une tenue.
 */
enum OutfitSource: string
{
    /** Composée par l'utilisateur. */
    case Manual = 'MANUAL';

    /** Acceptée depuis une suggestion. */
    case FromSuggestion = 'FROM_SUGGESTION';
}
