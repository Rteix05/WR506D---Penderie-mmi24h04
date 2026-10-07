<?php

namespace App\Enum\Place;

/**
 * Les décisions d'une colocation qui demandent l'accord de TOUS les
 * colocataires (décision du 30/09).
 */
enum PlaceDecisionKind: string
{
    /** Faire entrer quelqu'un : tous les colocs acceptent, et la personne invitée aussi. */
    case InviteMember = 'INVITE_MEMBER';

    /** Supprimer le logement (vide). */
    case DeletePlace = 'DELETE_PLACE';

    /** Supprimer une pièce commune (vide). */
    case DeleteRoom = 'DELETE_ROOM';
}
