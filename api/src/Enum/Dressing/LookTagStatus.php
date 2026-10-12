<?php

namespace App\Enum\Dressing;

/**
 * Ce que l'IA a conclu d'un point posé sur la photo, puis ce que
 * l'utilisateur en a fait.
 */
enum LookTagStatus: string
{
    /** L'IA a reconnu un vêtement du dressing : à confirmer. */
    case Matched = 'MATCHED';

    /** L'IA voit un vêtement qui n'est pas dans le dressing : à créer. */
    case New = 'NEW';

    /** L'IA n'a rien pu dire : l'utilisateur choisit lui-même. */
    case Unknown = 'UNKNOWN';

    /** L'utilisateur a désigné (ou confirmé) le vêtement. */
    case Confirmed = 'CONFIRMED';
}
