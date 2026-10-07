<?php

namespace App\Enum\Place;

enum PlaceDecisionStatus: string
{
    case Pending = 'PENDING';

    /** Tout le monde a dit oui : la décision est appliquée. */
    case Approved = 'APPROVED';

    /** Un seul non suffit. */
    case Rejected = 'REJECTED';

    /** Retirée par celui qui l'a demandée, ou devenue sans objet (départ, cible disparue). */
    case Cancelled = 'CANCELLED';
}
