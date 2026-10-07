<?php

namespace App\Enum\Loan;

/**
 * Les gestes et transitions d'un prêt, journalisés dans LoanEvent.
 */
enum LoanEventType: string
{
    case Requested = 'REQUESTED';

    case Accepted = 'ACCEPTED';

    case Declined = 'DECLINED';

    case Received = 'RECEIVED';

    case ReminderSent = 'REMINDER_SENT';

    case DueDateChanged = 'DUE_DATE_CHANGED';

    case ReturnDeclared = 'RETURN_DECLARED';

    case Returned = 'RETURNED';

    case DamageReported = 'DAMAGE_REPORTED';

    case DeclaredLost = 'DECLARED_LOST';

    case Cancelled = 'CANCELLED';
}
