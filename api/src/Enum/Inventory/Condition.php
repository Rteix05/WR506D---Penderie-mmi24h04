<?php

namespace App\Enum\Inventory;

/**
 * L'état physique, indépendant de la disponibilité.
 */
enum Condition: string
{
    case New = 'NEW';

    case Excellent = 'EXCELLENT';

    case Good = 'GOOD';

    case Worn = 'WORN';

    case Damaged = 'DAMAGED';

    /** 0 pour neuf, 4 pour abîmé : sert à constater un dommage au retour de prêt. */
    public function wear(): int
    {
        return match ($this) {
            self::New => 0,
            self::Excellent => 1,
            self::Good => 2,
            self::Worn => 3,
            self::Damaged => 4,
        };
    }

    public function isWorseThan(self $other): bool
    {
        return $this->wear() > $other->wear();
    }
}
