<?php

namespace App\Enum\Sharing;

/**
 * Ce qu'un élément de collection représente.
 */
enum CollectionEntryKind: string
{
    case Item = 'ITEM';

    case Garment = 'GARMENT';

    /** Une image d'inspiration. */
    case Media = 'MEDIA';

    /** Un texte libre, porté par caption. */
    case Text = 'TEXT';
}
