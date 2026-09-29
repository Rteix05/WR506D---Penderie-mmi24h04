<?php

namespace App\Enum\Dressing;

/**
 * Le sort d'une suggestion : mesure le taux d'acceptation.
 */
enum SuggestionStatus: string
{
    case Proposed = 'PROPOSED';

    /** Devenue une tenue. */
    case Accepted = 'ACCEPTED';

    case Rejected = 'REJECTED';

    /** L'utilisateur a demandé une autre suggestion. */
    case Replaced = 'REPLACED';
}
