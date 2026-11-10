<?php

namespace App\Enum\Notification;

/**
 * L'avancement d'un signalement : à traiter, en cours (un administrateur
 * l'a pris), traité par une action, ou classé sans suite.
 */
enum ReportStatus: string
{
    case Open = 'OPEN';

    case UnderReview = 'UNDER_REVIEW';

    case Actioned = 'ACTIONED';

    case Dismissed = 'DISMISSED';

    public function isPending(): bool
    {
        return self::Open === $this || self::UnderReview === $this;
    }
}
