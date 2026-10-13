<?php

namespace App\Tests\Api;

use App\Entity\Dressing\WearLog;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Contracts\HttpClient\ResponseInterface;

/**
 * Le look du jour (/api/looks) : chaque point désigne un vêtement du
 * dressing, ou en ajoute un d'un simple titre, « à compléter » plus tard.
 * Pas d'IA.
 *
 * @phpstan-import-type TestUser from ApiTestBase
 */
final class LookApiTest extends ApiTestBase
{
    /** Un PNG de 1 × 1 pixel. */
    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    /**
     * @param array<string, string> $fields
     *
     * @param TestUser $user
     */
    private function upload(array $user, string $url, array $fields = []): ResponseInterface
    {
        $path = tempnam(sys_get_temp_dir(), 'look');
        file_put_contents($path, base64_decode(self::PNG));

        return $this->client->request('POST', $url, [
            'headers' => ['Authorization' => 'Bearer '.$user['token'], 'Content-Type' => 'multipart/form-data'],
            'extra' => [
                'parameters' => $fields,
                'files' => ['image' => new UploadedFile($path, 'photo.png', 'image/png', null, true)],
            ],
        ]);
    }

    /**
     * @param TestUser $user
     * @return array<string, mixed>
     */
    private function garment(array $user, string $name): array
    {
        $garment = $this->call('POST', '/api/garments', $user, [
            'name' => $name,
            'room' => $this->roomOf($user),
            'category' => $this->garmentCategoryIri('jeans'),
        ])->toArray();
        self::assertResponseStatusCodeSame(201);

        return $garment;
    }

    public function testOneLookPerDay(): void
    {
        $alice = $this->signUp('alice');
        self::assertNull($this->call('GET', '/api/looks/today', $alice)->toArray()['look']);

        $look = $this->upload($alice, '/api/looks')->toArray();
        self::assertResponseStatusCodeSame(201);
        self::assertSame('TAGGING', $look['status']);
        self::assertSame(date('Y-m-d'), $look['wornOn']);
        self::assertSame([], $look['tags']);

        $this->call('GET', $look['photo']['url'], $alice);
        self::assertResponseIsSuccessful('la photo se lit avec le jeton de son propriétaire');

        $this->upload($alice, '/api/looks');
        self::assertResponseStatusCodeSame(409, 'un look par jour');
        self::assertSame($look['id'], $this->call('GET', '/api/looks/today', $alice)->toArray()['look']['id']);
    }

    /** Un point désigne un vêtement du dressing : il est confirmé tout de suite. */
    public function testAPointDesignatesAGarmentFromTheDressing(): void
    {
        $alice = $this->signUp('alice');
        $jean = $this->garment($alice, 'Jean 501');
        $look = $this->upload($alice, '/api/looks')->toArray();

        $tag = $this->call('POST', $look['@id'].'/tags', $alice, ['x' => 0.5, 'y' => 0.7, 'garment' => $jean['@id']])->toArray();
        self::assertResponseStatusCodeSame(201);
        self::assertSame('CONFIRMED', $tag['status']);
        self::assertSame($jean['@id'], $tag['garment']['@id']);
        self::assertFalse($tag['garment']['incomplete']);

        $ready = $this->call('PATCH', $look['@id'], $alice, ['status' => 'READY', 'caption' => 'Lundi en jean'])->toArray();
        self::assertResponseIsSuccessful();
        self::assertSame('READY', $ready['status']);
        self::assertSame('Lundi en jean', $ready['caption']);

        $em = static::getContainer()->get(EntityManagerInterface::class);
        self::assertCount(1, $em->getRepository(WearLog::class)->findBy(['garment' => $jean['id']]), 'le look prêt note le port du jour');

        // Retour en préparation puis de nouveau prêt : pas de second port le même jour.
        $this->call('PATCH', $look['@id'], $alice, ['status' => 'TAGGING']);
        $this->call('PATCH', $look['@id'], $alice, ['status' => 'READY']);
        self::assertResponseIsSuccessful();
        self::assertCount(1, $em->getRepository(WearLog::class)->findBy(['garment' => $jean['id']]));

        $this->call('POST', $look['@id'].'/tags', $alice, ['x' => 0.1, 'y' => 0.1, 'garment' => $jean['@id']]);
        self::assertResponseStatusCodeSame(422, 'un look prêt ne prend plus de point');

        $posted = $this->call('PATCH', $look['@id'], $alice, ['status' => 'POSTED'])->toArray();
        self::assertSame('POSTED', $posted['status']);
        self::assertNotNull($posted['postedAt']);
        $this->call('PATCH', $look['@id'], $alice, ['caption' => 'Autre légende']);
        self::assertResponseStatusCodeSame(422, 'un look posté ne se modifie plus');
        $this->call('PATCH', $look['@id'], $alice, ['status' => 'TAGGING']);
        self::assertResponseStatusCodeSame(422);
    }

    /**
     * Un vêtement absent du dressing : un titre suffit. Il est créé « à
     * compléter » (ni catégorie ni pièce), puis terminé plus tard.
     */
    public function testAGarmentNotInTheDressingIsAddedByItsTitleOnly(): void
    {
        $alice = $this->signUp('alice');
        $look = $this->upload($alice, '/api/looks')->toArray();

        $tag = $this->call('POST', $look['@id'].'/tags', $alice, ['x' => 0.4, 'y' => 0.3, 'name' => '  Veste kaki  '])->toArray();
        self::assertResponseStatusCodeSame(201);
        self::assertSame('CONFIRMED', $tag['status']);
        self::assertSame('Veste kaki', $tag['garment']['name']);
        self::assertTrue($tag['garment']['incomplete']);
        self::assertNull($tag['garment']['category']);

        $veste = $this->call('GET', $tag['garment']['@id'], $alice)->toArray();
        self::assertResponseIsSuccessful();
        self::assertTrue($veste['incomplete']);
        self::assertNull($veste['category'] ?? null);
        self::assertNull($veste['room'] ?? null, 'pas encore rangé');
        $dressing = $this->call('GET', '/api/garments', $alice)->toArray();
        self::assertContains($veste['@id'], array_column($dressing['member'] ?? $dressing['hydra:member'], '@id'), 'il est dans Mon dressing');

        // Le look peut être prêt : le point désigne bien un vêtement.
        $this->call('PATCH', $look['@id'], $alice, ['status' => 'READY']);
        self::assertResponseIsSuccessful();

        // On le termine : catégorie et pièce, puis le reste par la modification habituelle.
        $room = $this->roomOf($alice);
        $done = $this->call('POST', $veste['@id'].'/complete', $alice, ['category' => $this->garmentCategoryIri('vestes'), 'room' => $room])->toArray();
        self::assertResponseIsSuccessful();
        self::assertFalse($done['incomplete']);
        $veste = $this->call('PATCH', $veste['@id'], $alice, ['usage' => 'WORK'])->toArray();
        self::assertResponseIsSuccessful();
        self::assertFalse($veste['incomplete']);
        self::assertSame('WORK', $veste['usage']);

        $this->call('POST', $veste['@id'].'/complete', $alice, ['category' => $this->garmentCategoryIri('vestes'), 'room' => $room]);
        self::assertResponseStatusCodeSame(422, 'déjà complet : on ne le complète pas deux fois');
    }

    public function testCompletingIsValidatedAndReservedToTheOwner(): void
    {
        $alice = $this->signUp('alice');
        $bob = $this->signUp('bob');
        $look = $this->upload($alice, '/api/looks')->toArray();
        $tag = $this->call('POST', $look['@id'].'/tags', $alice, ['x' => 0.4, 'y' => 0.3, 'name' => 'Bonnet'])->toArray();
        $bonnet = $tag['garment']['@id'];

        $this->call('POST', $bonnet.'/complete', $alice, ['category' => $this->garmentCategoryIri('vestes')]);
        self::assertResponseStatusCodeSame(400, 'la pièce est obligatoire');
        $this->call('POST', $bonnet.'/complete', $bob, ['category' => $this->garmentCategoryIri('vestes'), 'room' => $this->roomOf($bob)]);
        self::assertResponseStatusCodeSame(404, 'le vêtement d\'un autre');
        $this->call('POST', $bonnet.'/complete', $alice, ['category' => $this->garmentCategoryIri('vestes'), 'room' => $this->roomOf($bob)]);
        self::assertResponseStatusCodeSame(403, 'ranger chez un autre');
    }

    public function testTagsAreValidatedAndRemovable(): void
    {
        $alice = $this->signUp('alice');
        $jean = $this->garment($alice, 'Jean 501');
        $look = $this->upload($alice, '/api/looks')->toArray();

        $this->call('POST', $look['@id'].'/tags', $alice, ['x' => 1.4, 'y' => 0.5, 'garment' => $jean['@id']]);
        self::assertResponseStatusCodeSame(422, 'hors de la photo');
        $this->call('POST', $look['@id'].'/tags', $alice, ['y' => 0.5, 'garment' => $jean['@id']]);
        self::assertResponseStatusCodeSame(400);
        $this->call('POST', $look['@id'].'/tags', $alice, ['x' => 0.2, 'y' => 0.5]);
        self::assertResponseStatusCodeSame(400, 'ni vêtement ni titre');
        $this->call('POST', $look['@id'].'/tags', $alice, ['x' => 0.2, 'y' => 0.5, 'garment' => $jean['@id'], 'name' => 'Autre']);
        self::assertResponseStatusCodeSame(400, 'l\'un ou l\'autre');

        $tag = $this->call('POST', $look['@id'].'/tags', $alice, ['x' => 0.2, 'y' => 0.5, 'garment' => $jean['@id']])->toArray();
        $this->call('DELETE', $look['@id'].'/tags/'.$tag['id'], $alice);
        self::assertResponseStatusCodeSame(204);
        self::assertSame([], $this->call('GET', $look['@id'], $alice)->toArray()['tags']);
    }

    public function testALookIsPrivate(): void
    {
        $alice = $this->signUp('alice');
        $bob = $this->signUp('bob');
        $look = $this->upload($alice, '/api/looks')->toArray();
        $tag = $this->call('POST', $look['@id'].'/tags', $alice, ['x' => 0.2, 'y' => 0.5, 'name' => 'Pull'])->toArray();

        $this->call('GET', $look['@id'], $bob);
        self::assertResponseStatusCodeSame(404);
        $this->call('GET', $look['photo']['url'], $bob);
        self::assertResponseStatusCodeSame(404);
        $this->call('DELETE', $look['@id'], $bob);
        self::assertResponseStatusCodeSame(404);

        // Désigner le vêtement d'un autre, qu'on ne voit pas : refusé.
        $sienne = $this->garment($bob, 'Jean de Bob');
        $this->call('PATCH', $look['@id'].'/tags/'.$tag['id'], $alice, ['garment' => $sienne['@id']]);
        self::assertResponseStatusCodeSame(404);
        $this->call('POST', $look['@id'].'/tags', $alice, ['x' => 0.3, 'y' => 0.5, 'garment' => $sienne['@id']]);
        self::assertResponseStatusCodeSame(404);
    }

    public function testDeletingALookRemovesItsPhoto(): void
    {
        $alice = $this->signUp('alice');
        $look = $this->upload($alice, '/api/looks')->toArray();

        $this->call('DELETE', $look['@id'], $alice);
        self::assertResponseStatusCodeSame(204);
        $this->call('GET', $look['photo']['url'], $alice);
        self::assertResponseStatusCodeSame(404);
        self::assertNull($this->call('GET', '/api/looks/today', $alice)->toArray()['look']);

        $this->upload($alice, '/api/looks');
        self::assertResponseStatusCodeSame(201, 'on peut reprendre une photo');
    }
}
