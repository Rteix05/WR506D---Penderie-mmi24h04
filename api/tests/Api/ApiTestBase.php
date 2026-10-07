<?php

namespace App\Tests\Api;

use ApiPlatform\Test\ApiTestCase;
use ApiPlatform\Test\Client;
use App\Entity\Reference\GarmentCategory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Contracts\HttpClient\ResponseInterface;

/**
 * Base des tests fonctionnels : de vraies requêtes HTTP à travers tout le
 * noyau (pare-feu JWT, voters, extensions de requête, validation). Chaque
 * test tourne dans une transaction annulée (dama/doctrine-test-bundle).
 */
abstract class ApiTestBase extends ApiTestCase
{
    protected static ?bool $alwaysBootKernel = true;

    protected const PASSWORD = 'un-mot-de-passe-solide';

    protected Client $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
    }

    /** Inscrit un compte et renvoie ['token' => …, 'profileId' => …, 'email' => …]. */
    protected function signUp(string $username, string $birth = '1995-01-01'): array
    {
        $email = $username.'@exemple.fr';
        $response = $this->client->request('POST', '/api/auth/register', ['json' => [
            'email' => $email,
            'password' => self::PASSWORD,
            'firstName' => ucfirst($username),
            'lastName' => 'Test',
            'dateOfBirth' => $birth,
            'username' => $username,
        ]]);
        self::assertResponseStatusCodeSame(201);

        return ['token' => $this->login($email), 'profileId' => $response->toArray()['profile']['id'], 'email' => $email];
    }

    protected function login(string $email, string $password = self::PASSWORD): string
    {
        $response = $this->client->request('POST', '/api/auth/login', ['json' => ['email' => $email, 'password' => $password]]);
        self::assertResponseIsSuccessful();

        return $response->toArray()['token'];
    }

    /** @param array<string, mixed>|null $json */
    protected function call(string $method, string $url, array $user, ?array $json = null, ?string $profileId = null): ResponseInterface
    {
        $headers = ['Authorization' => 'Bearer '.$user['token'], 'Accept' => 'application/ld+json'];
        if (null !== $profileId) {
            $headers['X-Profile'] = $profileId;
        }
        $options = ['headers' => $headers];
        if (null !== $json) {
            $options['json'] = $json;
            if ('PATCH' === $method) {
                $options['headers']['Content-Type'] = 'application/merge-patch+json';
            }
        }

        return $this->client->request($method, $url, $options);
    }

    /** Crée logement + pièce pour ce compte, renvoie l'IRI de la pièce. */
    protected function roomOf(array $user, ?string $profileId = null): string
    {
        $place = $this->call('POST', '/api/places', $user, ['name' => 'Maison', 'type' => 'HOUSE'], $profileId)->toArray();
        self::assertResponseStatusCodeSame(201);
        $room = $this->call('POST', '/api/rooms', $user, ['place' => $place['@id'], 'name' => 'Garage', 'type' => 'GARAGE'], $profileId)->toArray();
        self::assertResponseStatusCodeSame(201);

        return $room['@id'];
    }

    protected function garmentCategoryIri(string $slug): string
    {
        $em = static::getContainer()->get(EntityManagerInterface::class);

        return '/api/garment_categories/'.$em->getRepository(GarmentCategory::class)->findOneBy(['slug' => $slug, 'owner' => null])->getId();
    }
}
