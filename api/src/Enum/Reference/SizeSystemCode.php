<?php

namespace App\Enum\Reference;

/**
 * Les échelles de mesure. C'est la catégorie de vêtement qui déclare la
 * sienne ; la taille d'un vêtement est une graduation de cette échelle.
 */
enum SizeSystemCode: string
{
    /** Pointure européenne, enfant comprise (16 à 50). */
    case EuShoe = 'EU_SHOE';

    /** XXS à 4XL. */
    case Alpha = 'ALPHA';

    /** Tour de taille et longueur de jambe : « W32 L34 ». */
    case WaistLength = 'WAIST_LENGTH';

    /** Taille française 32 à 56. */
    case FrNumeric = 'FR_NUMERIC';

    /** Tour de cou, en cm. */
    case Collar = 'COLLAR';

    /** Longueur de ceinture, en cm. */
    case BeltCm = 'BELT_CM';

    case OneSize = 'ONE_SIZE';

    /** Tailles enfant par âge, de la naissance à 16 ans (ajout du 29/09). */
    case KidsAge = 'KIDS_AGE';
}
