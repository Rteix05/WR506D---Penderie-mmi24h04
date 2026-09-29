<?php

namespace App\Enum\Reference;

/**
 * La chaleur d'un vêtement, lue par le moteur de suggestion face à la
 * météo. Déclarée par défaut sur la catégorie, héritée par le vêtement.
 */
enum Warmth: string
{
    case VeryLight = 'VERY_LIGHT';
    case Light = 'LIGHT';
    case Mid = 'MID';
    case Warm = 'WARM';
    case VeryWarm = 'VERY_WARM';
}
