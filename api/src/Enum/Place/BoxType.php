<?php

namespace App\Enum\Place;

/**
 * Le type de conteneur (décision du 29/09) : un Box n'est pas qu'un carton,
 * c'est le 4e niveau de rangement, facultatif, posé dans une pièce ou sur
 * un rangement (« Armoire › Étagère 2 »).
 */
enum BoxType: string
{
    /** Carton : le seul qui peut être scellé. */
    case Carton = 'CARTON';

    /** Étagère à l'intérieur d'un rangement. */
    case Shelf = 'SHELF';

    /** Tiroir. */
    case Drawer = 'DRAWER';

    /** Bac, boîte, panier. */
    case Bin = 'BIN';

    /** Valise. */
    case Suitcase = 'SUITCASE';

    /** Sac, housse. */
    case Bag = 'BAG';

    case Other = 'OTHER';
}
