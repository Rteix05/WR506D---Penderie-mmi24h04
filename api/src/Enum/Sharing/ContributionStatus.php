<?php

namespace App\Enum\Sharing;

/**
 * Le sort d'une contribution.
 */
enum ContributionStatus: string
{
    case Pending = 'PENDING';

    /** Appliquée. */
    case Accepted = 'ACCEPTED';

    case Rejected = 'REJECTED';

    /** Retirée par son auteur avant la décision. */
    case Withdrawn = 'WITHDRAWN';
}
