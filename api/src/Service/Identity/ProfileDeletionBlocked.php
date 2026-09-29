<?php

namespace App\Service\Identity;

/**
 * La suppression d'un profil est bloquée par une situation qui implique un
 * tiers (un prêt en cours, une commande en cours) : il faut la clore
 * avant. Traduite en HTTP 409 Conflict par API Platform.
 */
final class ProfileDeletionBlocked extends \RuntimeException
{
}
