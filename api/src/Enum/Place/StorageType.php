<?php

namespace App\Enum\Place;

/**
 * Le type de meuble ou de rangement.
 */
enum StorageType: string
{
    /** Armoire, penderie. */
    case Wardrobe = 'WARDROBE';

    /** Placard. */
    case Closet = 'CLOSET';

    /** Étagère. */
    case Shelf = 'SHELF';

    /** Bibliothèque. */
    case Bookcase = 'BOOKCASE';

    /** Meuble, buffet, meuble TV. */
    case Cabinet = 'CABINET';

    /** Commode. */
    case Dresser = 'DRESSER';

    /** Caisson à tiroirs. */
    case Drawer = 'DRAWER';

    /** Portant. */
    case Rack = 'RACK';

    /** Coffre. */
    case Chest = 'CHEST';

    case Other = 'OTHER';
}
