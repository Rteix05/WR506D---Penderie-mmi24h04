<?php

namespace App\Enum\Sale;

/**
 * Le cycle de vie d'une commande.
 */
enum OrderStatus: string
{
    case PendingPayment = 'PENDING_PAYMENT';

    /** Espèces : en attente de la remise. */
    case AwaitingHandover = 'AWAITING_HANDOVER';

    case Paid = 'PAID';

    case Shipped = 'SHIPPED';

    case Delivered = 'DELIVERED';

    case Completed = 'COMPLETED';

    case Cancelled = 'CANCELLED';

    case Refunded = 'REFUNDED';
}
