<?php

namespace App\Enum\Sale;

/**
 * Le rôle d'une adresse figée dans une commande.
 */
enum AddressRole: string
{
    case Shipping = 'SHIPPING';

    case Billing = 'BILLING';
}
