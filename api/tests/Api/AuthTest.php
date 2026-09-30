<?php

namespace App\Tests\Api;

use App\Entity\Identity\Profile;
use App\Enum\Identity\ProfileType;
use Doctrine\ORM\EntityManagerInterface;

final class AuthTest extends ApiTestBase
{
    public function testRegisterLoginAndMe(): void
    {
        $rafael = $this->signUp('rafael');

        $me = $this->call('GET', '/api/me', $rafael)->toArray();
        self::assertSame('rafael@exemple.fr', $me['account']['email']);
        self::assertCount(1, $me['profiles']);
        self::assertSame($rafael['profileId'], $me['activeProfile'], 'sans en-tête X-Profile : le profil par défaut');
        self::assertTrue($me['profiles'][0]['isDefault']);
    }

    public function testRegistrationRules(): void
    {
        $this->signUp('rafael');
        $payload = ['email' => 'rafael@exemple.fr', 'password' => self::PASSWORD, 'firstName' => 'R', 'lastName' => 'T', 'dateOfBirth' => '1990-01-01', 'username' => 'autre'];

        $this->client->request('POST', '/api/auth/register', ['json' => $payload]);
        self::assertResponseStatusCodeSame(422, 'email déjà pris');

        $this->client->request('POST', '/api/auth/register', ['json' => ['password' => 'court', 'email' => 'x@exemple.fr'] + $payload]);
        self::assertResponseStatusCodeSame(422, 'mot de passe trop court');

        $this->client->request('POST', '/api/auth/register', ['json' => ['email' => 'y@exemple.fr', 'username' => 'Majuscules'] + $payload]);
        self::assertResponseStatusCodeSame(422, 'username invalide');
    }

    public function testLoginFailuresAndProtectedRoutes(): void
    {
        $this->signUp('rafael');

        // Un mot de passe volontairement faux, dérivé de celui du test plutôt qu'écrit en dur.
        $this->client->request('POST', '/api/auth/login', ['json' => ['email' => 'rafael@exemple.fr', 'password' => strrev(self::PASSWORD)]]);
        self::assertResponseStatusCodeSame(401);

        $this->client->request('POST', '/api/auth/login', ['json' => ['email' => 'fantome@penderie.invalid', 'password' => '']]);
        self::assertResponseStatusCodeSame(401, 'personne ne se connecte au compte fantôme');

        $this->client->request('GET', '/api/me');
        self::assertResponseStatusCodeSame(401);
        $this->client->request('GET', '/api/items');
        self::assertResponseStatusCodeSame(401);
    }

    public function testRefreshTokenIsSingleUse(): void
    {
        $this->signUp('rafael');
        $login = $this->client->request('POST', '/api/auth/login', ['json' => ['email' => 'rafael@exemple.fr', 'password' => self::PASSWORD]])->toArray();
        self::assertArrayHasKey('refreshToken', $login);

        $refreshed = $this->client->request('POST', '/api/auth/refresh', ['json' => ['refreshToken' => $login['refreshToken']]])->toArray();
        self::assertResponseIsSuccessful();
        self::assertNotEmpty($refreshed['token']);
        self::assertNotSame($login['refreshToken'], $refreshed['refreshToken']);

        $this->client->request('POST', '/api/auth/refresh', ['json' => ['refreshToken' => $login['refreshToken']]]);
        self::assertResponseStatusCodeSame(401, 'un jeton de rafraîchissement déjà utilisé est refusé');
    }

    public function testActiveProfileHeader(): void
    {
        $rafael = $this->signUp('rafael');
        $thomas = $this->signUp('thomas');

        // Léa, profil enfant ajouté au compte de Rafael.
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $guardian = $em->find(Profile::class, $rafael['profileId']);
        $lea = new Profile($guardian->getAccount(), ProfileType::Child, 'Léa', 'T', new \DateTimeImmutable('2016-03-12'), 'lea', $guardian);
        $em->persist($lea);
        $em->flush();

        $me = $this->call('GET', '/api/me', $rafael, null, (string) $lea->getId())->toArray();
        self::assertSame((string) $lea->getId(), (string) $me['activeProfile']);
        self::assertCount(2, $this->call('GET', '/api/profiles', $rafael)->toArray()['member']);

        $this->call('GET', '/api/me', $thomas, null, (string) $lea->getId());
        self::assertResponseStatusCodeSame(403, 'le profil d\'un autre compte est refusé');

        $this->call('GET', '/api/profiles/'.$lea->getId(), $thomas);
        self::assertResponseStatusCodeSame(403);

        // Le noyau redémarre entre deux requêtes : on suspend en SQL plutôt que
        // par un EntityManager qui ne suit plus l'entité.
        static::getContainer()->get(EntityManagerInterface::class)->getConnection()
            ->executeStatement('UPDATE profile SET suspended_at = now() WHERE id = ?', [(string) $lea->getId()]);
        $this->call('GET', '/api/me', $rafael, null, (string) $lea->getId());
        self::assertResponseStatusCodeSame(403, 'un profil suspendu ne peut pas agir');
    }
}
