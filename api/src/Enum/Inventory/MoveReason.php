<?php

namespace App\Enum\Inventory;

/**
 * Pourquoi un objet a changé d'emplacement.
 */
enum MoveReason: string
{
    case ManualMove = 'MANUAL_MOVE';

    /** Son conteneur, ou le meuble qui le porte, a été déplacé. */
    case BoxMoved = 'BOX_MOVED';

    /** Rangé à son retour de prêt. */
    case LoanReturn = 'LOAN_RETURN';

    /** Premier rangement. */
    case Initial = 'INITIAL';
}
