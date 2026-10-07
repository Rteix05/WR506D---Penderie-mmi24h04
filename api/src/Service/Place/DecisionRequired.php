<?php

namespace App\Service\Place;

/**
 * En colocation, supprimer le logement ou une pièce commune se décide à
 * l'unanimité (POST /api/places/{id}/decisions) : 409 sur un DELETE direct.
 */
final class DecisionRequired extends \RuntimeException
{
}
