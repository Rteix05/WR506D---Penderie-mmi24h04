<?php

namespace App\Enum\Dressing;

/**
 * La saison d'une tenue. Nulle = toutes saisons.
 */
enum Season: string
{
    case Spring = 'SPRING';

    case Summer = 'SUMMER';

    case Autumn = 'AUTUMN';

    case Winter = 'WINTER';
}
