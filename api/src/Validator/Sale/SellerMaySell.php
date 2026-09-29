<?php

namespace App\Validator\Sale;

use Symfony\Component\Validator\Constraint;

/**
 * Un profil dont la permission SELL est DENIED (un enfant, par défaut) ne
 * met rien en vente.
 */
#[\Attribute(\Attribute::TARGET_CLASS)]
final class SellerMaySell extends Constraint
{
    public string $denied = 'Ce profil n\'est pas autorisé à vendre.';

    public function getTargets(): string
    {
        return self::CLASS_CONSTRAINT;
    }
}
