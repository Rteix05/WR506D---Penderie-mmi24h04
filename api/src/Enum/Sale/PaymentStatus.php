<?php

namespace App\Enum\Sale;

/**
 * L'état d'un mouvement chez le prestataire.
 */
enum PaymentStatus: string
{
    case Pending = 'PENDING';

    case Authorized = 'AUTHORIZED';

    case Captured = 'CAPTURED';

    case Failed = 'FAILED';

    case Cancelled = 'CANCELLED';
}
