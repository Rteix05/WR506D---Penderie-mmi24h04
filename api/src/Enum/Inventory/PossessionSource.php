<?php

namespace App\Enum\Inventory;

/**
 * Comment l'objet ou le vêtement est entré dans l'inventaire.
 */
enum PossessionSource: string
{
    case Manual = 'MANUAL';

    /** Pré-rempli par un scan : scanData garde ce qui a été lu. */
    case Scan = 'SCAN';
}
