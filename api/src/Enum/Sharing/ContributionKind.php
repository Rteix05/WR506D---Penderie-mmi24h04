<?php

namespace App\Enum\Sharing;

/**
 * Ce qu'une personne autorisée à modifier (partage EDIT) propose au
 * propriétaire. Rien n'est appliqué avant sa validation.
 */
enum ContributionKind: string
{
    /** Ranger un de SES objets chez le propriétaire (le carton déposé chez un
     * proche) : l'objet reste à celui qui le dépose. */
    case PlacePossession = 'PLACE_POSSESSION';

    /** Poser un élément sur un moodboard partagé. */
    case AddCollectionEntry = 'ADD_COLLECTION_ENTRY';

    /** Corriger un champ existant (nom, description…). */
    case EditFields = 'EDIT_FIELDS';
}
