<?php

namespace App\Validator\Place;

use Symfony\Component\Validator\Constraint;

/**
 * Un conteneur posé sur un rangement est dans la pièce de ce rangement.
 *
 * Règle qui lit une autre ligne (le rangement) : un CHECK ne peut pas la
 * porter, et une clé étrangère composite (storage_id, room_id) ne se
 * déclare pas en mapping Doctrine.
 */
#[\Attribute(\Attribute::TARGET_CLASS)]
final class BoxInStorageRoom extends Constraint
{
    public string $message = 'Ce rangement se trouve dans une autre pièce que le conteneur.';

    public function getTargets(): string
    {
        return self::CLASS_CONSTRAINT;
    }
}
