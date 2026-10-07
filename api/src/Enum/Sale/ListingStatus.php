<?php

namespace App\Enum\Sale;

/**
 * Le cycle de vie d'une annonce : seule détentrice de l'état « en vente ».
 */
enum ListingStatus: string
{
    case Draft = 'DRAFT';

    case Published = 'PUBLISHED';

    /** Une commande est en cours. */
    case Reserved = 'RESERVED';

    case Sold = 'SOLD';

    /** Retirée par le vendeur. */
    case Withdrawn = 'WITHDRAWN';

    case Expired = 'EXPIRED';
}
