<?php

namespace App\Enum\Sale;

/**
 * L'état d'un remboursement chez le prestataire.
 */
enum RefundStatus: string
{
    case Requested = 'REQUESTED';

    case Processing = 'PROCESSING';

    case Succeeded = 'SUCCEEDED';

    case Failed = 'FAILED';
}
