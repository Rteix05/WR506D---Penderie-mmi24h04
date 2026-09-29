<?php

namespace App\Enum\Sharing;

/**
 * L'état de partage d'une collection, tel que l'affiche l'interface.
 * L'accès réel passe toujours par un CollectionShare actif.
 */
enum CollectionVisibility: string
{
    case Private = 'PRIVATE';

    case Shared = 'SHARED';

    case Link = 'LINK';
}
