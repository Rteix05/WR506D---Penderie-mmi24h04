<?php

namespace App\Enum\Sale;

/**
 * Le motif d'un litige.
 */
enum DisputeReason: string
{
    case NotReceived = 'NOT_RECEIVED';

    case NotAsDescribed = 'NOT_AS_DESCRIBED';

    case Damaged = 'DAMAGED';

    case PaymentIssue = 'PAYMENT_ISSUE';

    case Other = 'OTHER';
}
