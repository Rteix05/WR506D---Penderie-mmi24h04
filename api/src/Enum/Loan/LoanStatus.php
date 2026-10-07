<?php

namespace App\Enum\Loan;

/**
 * Le cycle de vie d'un prêt. « En retard » n'en fait pas partie : c'est
 * ACTIVE + dueDate dépassée, calculé (Loan::isOverdue).
 */
enum LoanStatus: string
{
    /** Demandé par l'emprunteur. */
    case Requested = 'REQUESTED';

    /** Accepté par le prêteur, pas encore remis. */
    case Accepted = 'ACCEPTED';

    /** Remis : l'objet est chez l'emprunteur. */
    case Active = 'ACTIVE';

    /** Retour confirmé par le prêteur. */
    case Returned = 'RETURNED';

    case Declined = 'DECLINED';

    case Cancelled = 'CANCELLED';

    /** Perdu pendant le prêt. */
    case Lost = 'LOST';

    /** Un prêt ouvert bloque la vente de l'objet et la suppression du profil. */
    public function isOpen(): bool
    {
        return \in_array($this, [self::Requested, self::Accepted, self::Active], true);
    }
}
