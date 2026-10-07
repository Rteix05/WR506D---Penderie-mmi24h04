<?php

namespace App\Enum\Place;

/**
 * Le type de pièce. Sert à l'icône et aux filtres ; le nom reste libre (« Chambre de Léa »).
 */
enum RoomType: string
{
    /** Salon. */
    case LivingRoom = 'LIVING_ROOM';

    /** Chambre. */
    case Bedroom = 'BEDROOM';

    /** Cuisine. */
    case Kitchen = 'KITCHEN';

    /** Salle de bain. */
    case Bathroom = 'BATHROOM';

    /** Bureau. */
    case Office = 'OFFICE';

    /** Entrée. */
    case Entrance = 'ENTRANCE';

    /** Dressing. */
    case Dressing = 'DRESSING';

    /** Buanderie. */
    case Laundry = 'LAUNDRY';

    /** Garage. */
    case Garage = 'GARAGE';

    /** Cave. */
    case Cellar = 'CELLAR';

    /** Grenier. */
    case Attic = 'ATTIC';

    case Other = 'OTHER';
}
