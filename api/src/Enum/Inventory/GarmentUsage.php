<?php

namespace App\Enum\Inventory;

/**
 * L'usage principal d'un vêtement, lu par le moteur de suggestion.
 */
enum GarmentUsage: string
{
    case Everyday = 'EVERYDAY';

    case Work = 'WORK';

    case Sport = 'SPORT';

    case Evening = 'EVENING';
}
