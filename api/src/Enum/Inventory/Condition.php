<?php

namespace App\Enum\Inventory;

/**
 * L'état physique, indépendant de la disponibilité.
 */
enum Condition: string
{
    case New = 'NEW';

    case Excellent = 'EXCELLENT';

    case Good = 'GOOD';

    case Worn = 'WORN';

    case Damaged = 'DAMAGED';
}
