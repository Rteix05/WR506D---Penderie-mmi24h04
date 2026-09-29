<?php

namespace App\Enum\Sale;

/**
 * L'avancement d'un litige. La plateforme trace et escalade, elle n'arbitre pas.
 */
enum DisputeStatus: string
{
    case Open = 'OPEN';

    case UnderReview = 'UNDER_REVIEW';

    case Resolved = 'RESOLVED';

    case Closed = 'CLOSED';
}
