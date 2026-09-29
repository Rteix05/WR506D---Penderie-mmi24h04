<?php

namespace App\Enum\Dressing;

/**
 * Le temps au moment d'une suggestion, figé avec elle (on ne stocke
 * jamais un bulletin météo comme entité).
 */
enum Weather: string
{
    case Sunny = 'SUNNY';

    case Cloudy = 'CLOUDY';

    case Rain = 'RAIN';

    case Snow = 'SNOW';

    case Wind = 'WIND';
}
