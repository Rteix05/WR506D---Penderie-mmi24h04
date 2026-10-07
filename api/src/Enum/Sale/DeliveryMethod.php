<?php

namespace App\Enum\Sale;

/**
 * Comment l'objet change de mains, décidé à l'achat.
 */
enum DeliveryMethod: string
{
    case Shipping = 'SHIPPING';

    /** En main propre. */
    case Handover = 'HANDOVER';
}
