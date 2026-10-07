<?php

namespace App\Entity\Identity;

use Doctrine\ORM\Mapping as ORM;
use Gesdinet\JWTRefreshTokenBundle\Entity\RefreshToken as BaseRefreshToken;

/**
 * Le jeton de rafraîchissement de l'authentification JWT. Table technique
 * gérée par gesdinet/jwt-refresh-token-bundle (MDD : « rien à modéliser de
 * notre côté ») : rattachée au compte par username (l'email), sans clé
 * étrangère.
 */
#[ORM\Entity]
#[ORM\Table(name: 'refresh_tokens')]
class RefreshToken extends BaseRefreshToken
{
}
