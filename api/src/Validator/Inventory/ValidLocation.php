<?php

namespace App\Validator\Inventory;

use Symfony\Component\Validator\Constraint;

/**
 * L'emplacement d'un objet est une cascade cohérente : le rangement est
 * dans la pièce, le conteneur aussi, et un objet rangé dans un conteneur
 * est sur le rangement de ce conteneur.
 */
#[\Attribute(\Attribute::TARGET_CLASS)]
final class ValidLocation extends Constraint
{
    public string $storageElsewhere = 'Ce rangement se trouve dans une autre pièce.';
    public string $boxElsewhere = 'Ce conteneur se trouve dans une autre pièce.';
    public string $boxOnOtherStorage = 'Ce conteneur n\'est pas posé sur ce rangement.';

    public function getTargets(): string
    {
        return self::CLASS_CONSTRAINT;
    }
}
