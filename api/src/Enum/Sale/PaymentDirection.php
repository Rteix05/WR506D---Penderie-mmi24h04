<?php

namespace App\Enum\Sale;

/**
 * Le sens d'un mouvement d'argent qui transite par la plateforme.
 */
enum PaymentDirection: string
{
    /** Acheteur → plateforme. */
    case Charge = 'CHARGE';

    /** Plateforme → vendeur. */
    case Payout = 'PAYOUT';
}
