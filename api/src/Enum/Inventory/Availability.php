<?php

namespace App\Enum\Inventory;

/**
 * La disponibilité d'un objet ou d'un vêtement, indépendante de son état
 * physique. « En vente » n'en fait pas partie : c'est un état dérivé
 * (une Listing PUBLISHED ou RESERVED existe).
 */
enum Availability: string
{
    case Available = 'AVAILABLE';

    /** Prêté à quelqu'un : un Loan ACTIVE existe. */
    case Lent = 'LENT';

    /** Emprunté : il ne peut pas être re-prêté (pas de sous-prêt). */
    case Borrowed = 'BORROWED';

    case Lost = 'LOST';

    case Sold = 'SOLD';
}
