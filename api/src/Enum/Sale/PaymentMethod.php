<?php

namespace App\Enum\Sale;

/**
 * Comment on paie, décidé à l'achat.
 */
enum PaymentMethod: string
{
    /** Par le prestataire de paiement. */
    case Online = 'ONLINE';

    /** En espèces, à la remise : aucun argent ne transite par la plateforme. */
    case Cash = 'CASH';
}
