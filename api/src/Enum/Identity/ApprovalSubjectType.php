<?php

namespace App\Enum\Identity;

/**
 * Le type de la ressource visée par une ApprovalRequest (subjectType).
 *
 * Le MDD ne fixe pas la liste : ce sont les cibles possibles des
 * permissions soumises à accord (ami, prêt, partage, commentaire, achat,
 * vente). À compléter si une nouvelle permission vise autre chose.
 */
enum ApprovalSubjectType: string
{
    case Profile = 'PROFILE';
    case Item = 'ITEM';
    case Garment = 'GARMENT';
    case Collection = 'COLLECTION';
    case Share = 'SHARE';
    case Post = 'POST';
    case Listing = 'LISTING';
}
