<?php

namespace App\Enum\Place;

/**
 * Le type de logement.
 */
enum PlaceType: string
{
    /** Maison. */
    case House = 'HOUSE';

    /** Appartement. */
    case Apartment = 'APARTMENT';

    /** Garde-meuble, box de stockage. */
    case StorageUnit = 'STORAGE_UNIT';

    case Other = 'OTHER';
}
