<?php

namespace App\Enum\Dressing;

/**
 * Où en est un look du jour.
 *
 * TAGGING › READY › POSTED : on pointe les vêtements sur la photo, on
 * valide (chaque point désigne alors un vêtement du dressing), puis on
 * note que le post Instagram est parti. La publication elle-même se fait
 * hors de l'API.
 */
enum LookStatus: string
{
    /** Photo prise, points en cours de placement ou de vérification. */
    case Tagging = 'TAGGING';

    /** Tous les points désignent un vêtement : le post peut partir. */
    case Ready = 'READY';

    /** Le post est parti. Le look ne se modifie plus. */
    case Posted = 'POSTED';

    public function canMoveTo(self $next): bool
    {
        return match ($this) {
            self::Tagging => self::Ready === $next,
            self::Ready => self::Tagging === $next || self::Posted === $next,
            self::Posted => false,
        };
    }
}
