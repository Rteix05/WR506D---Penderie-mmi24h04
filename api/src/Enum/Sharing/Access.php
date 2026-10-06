<?php

namespace App\Enum\Sharing;

/**
 * Ce qu'un profil peut faire sur une ressource — les quatre valeurs du
 * tableau des droits (docs/PENDERIE_DROITS_v2.xlsx).
 */
enum Access: string
{
    /** Tout : voir, modifier, supprimer, prêter, vendre, partager. */
    case Admin = 'ADMIN';

    /**
     * Modifier : directement dans une pièce commune de coloc ; sinon
     * PROPOSER, le propriétaire valide (Contribution).
     */
    case Edit = 'EDIT';

    /** Voir, sans les champs privés. */
    case View = 'VIEW';

    case Denied = 'DENIED';
}
