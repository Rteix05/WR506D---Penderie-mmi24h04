<?php

namespace App\Enum\Inventory;

/**
 * Le résultat d'un scan, gardé pour mesurer la fiabilité.
 */
enum ScanStatus: string
{
    case Success = 'SUCCESS';

    /** Une partie seulement des champs a été reconnue. */
    case Partial = 'PARTIAL';

    case Failed = 'FAILED';
}
