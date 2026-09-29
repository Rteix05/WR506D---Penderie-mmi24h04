<?php

namespace App\Enum\Sharing;

/**
 * L'affichage d'une collection.
 */
enum CollectionLayout: string
{
    case List = 'LIST';

    /** Éléments posés librement : position, taille, rotation, superposition. */
    case Moodboard = 'MOODBOARD';
}
