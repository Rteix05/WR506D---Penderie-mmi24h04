<?php

namespace App\Enum\Sharing;

/**
 * Ce qui autorise quelqu'un à PROPOSER une modification (le propriétaire
 * valide toujours).
 */
enum ContributionBasis: string
{
    /** Un partage « Modifier » à son nom. */
    case Share = 'SHARE';

    /**
     * Un autre profil du même compte (le foyer) : un adulte propose sur les
     * objets, pièces, rangements et catégories ; un mineur sur les
     * rangements et catégories (tableau des droits, 30/09).
     */
    case Household = 'HOUSEHOLD';
}
