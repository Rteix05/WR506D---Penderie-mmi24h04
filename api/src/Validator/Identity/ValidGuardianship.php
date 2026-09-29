<?php

namespace App\Validator\Identity;

use Symfony\Component\Validator\Constraint;

/**
 * Les règles de tutelle qu'une contrainte CHECK ne peut pas porter, parce
 * qu'elles lisent une autre ligne (le tuteur) ou dépendent de la date du
 * jour. Les règles purement locales à la ligne sont doublées en base.
 */
#[\Attribute(\Attribute::TARGET_CLASS)]
final class ValidGuardianship extends Constraint
{
    public string $childWithoutGuardian = 'Un profil enfant doit avoir un tuteur.';
    public string $selfGuardian = 'Un profil ne peut pas être son propre tuteur.';
    public string $guardianNotAdult = 'Le tuteur doit être un profil adulte.';
    public string $guardianOtherAccount = 'Le tuteur doit appartenir au même compte.';
    public string $adultWithGuardian = 'Un profil adulte n\'a pas de tuteur.';
    public string $childOfAge = 'Un profil de plus de {{ age }} ans ne peut pas être créé en profil enfant.';

    public function getTargets(): string
    {
        return self::CLASS_CONSTRAINT;
    }
}
