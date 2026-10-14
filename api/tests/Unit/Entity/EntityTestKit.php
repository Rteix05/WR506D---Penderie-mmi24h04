<?php

namespace App\Tests\Unit\Entity;

use App\Entity\Identity\Account;
use App\Entity\Identity\Profile;
use App\Enum\Identity\ProfileType;
use Symfony\Component\Uid\Uuid;

/**
 * Fabriques des tests unitaires d'entités : de vrais objets, sans base.
 */
trait EntityTestKit
{
    private static function adult(string $username, ?Account $account = null): Profile
    {
        return new Profile($account ?? new Account($username.'@exemple.fr'), ProfileType::Adult, ucfirst($username), 'Test', new \DateTimeImmutable('1995-01-01'), $username);
    }

    /**
     * Le profil fantôme (inséré par la migration, jamais construit par le
     * code) : un profil dont l'identifiant est Profile::GHOST_ID.
     */
    private static function ghost(): Profile
    {
        $ghost = self::adult('fantome');
        (new \ReflectionProperty(Profile::class, 'id'))->setValue($ghost, Uuid::fromString(Profile::GHOST_ID));

        return $ghost;
    }

    /** Le geste est refusé, avec ce message exact. */
    private static function assertRefused(string $message, callable $gesture): void
    {
        try {
            $gesture();
            self::fail("Accepté, alors que : $message");
        } catch (\LogicException $e) {
            self::assertSame($message, $e->getMessage());
        }
    }
}
