<?php

namespace App\Enum\Reference;

/**
 * La famille d'une couleur : regroupe les nuances pour les filtres et les
 * préférences (« j'aime les bleus » couvre marine, ciel et turquoise).
 */
enum ColorFamily: string
{
    case Black = 'BLACK';
    case White = 'WHITE';
    case Grey = 'GREY';
    case Beige = 'BEIGE';
    case Brown = 'BROWN';
    case Red = 'RED';
    case Pink = 'PINK';
    case Orange = 'ORANGE';
    case Yellow = 'YELLOW';
    case Green = 'GREEN';
    case Blue = 'BLUE';
    case Purple = 'PURPLE';
    case Metallic = 'METALLIC';
    case Multi = 'MULTI';
}
