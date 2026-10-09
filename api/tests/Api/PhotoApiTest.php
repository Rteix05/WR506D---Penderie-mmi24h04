<?php

namespace App\Tests\Api;

use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Contracts\HttpClient\ResponseInterface;

final class PhotoApiTest extends ApiTestBase
{
    /** Un PNG de 1 × 1 pixel : le plus petit fichier image valide. */
    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    public function testOwnerAddsPhotosAndTheFirstIsPrimary(): void
    {
        $rafael = $this->signUp('rafael');
        $item = $this->call('POST', '/api/items', $rafael, ['name' => 'Perceuse', 'room' => $this->roomOf($rafael)])->toArray();
        self::assertSame([], $item['photos'], 'un objet sans photo : liste vide');

        $first = $this->upload($item['@id'].'/photos', $rafael)->toArray();
        self::assertResponseStatusCodeSame(201);
        self::assertTrue($first['primary']);
        self::assertSame([1, 1], [$first['width'], $first['height']]);
        $second = $this->upload($item['@id'].'/photos', $rafael)->toArray();
        self::assertFalse($second['primary']);

        $read = $this->call('GET', $item['@id'], $rafael)->toArray();
        self::assertSame([$first['url'], $second['url']], $read['photos'], 'la principale d\'abord');

        $file = $this->call('GET', $first['url'], $rafael);
        self::assertResponseIsSuccessful();
        self::assertSame('image/png', $file->getHeaders()['content-type'][0]);
        self::assertSame(base64_decode(self::PNG), $file->getContent());
        self::assertStringContainsString('private', $file->getHeaders()['cache-control'][0]);
    }

    public function testGarmentPhoto(): void
    {
        $rafael = $this->signUp('rafael');
        $garment = $this->call('POST', '/api/garments', $rafael, ['name' => 'T-shirt', 'room' => $this->roomOf($rafael), 'category' => $this->garmentCategoryIri('t-shirts')])->toArray();

        $photo = $this->upload($garment['@id'].'/photos', $rafael)->toArray();
        self::assertResponseStatusCodeSame(201);
        self::assertSame([$photo['url']], $this->call('GET', $garment['@id'], $rafael)->toArray()['photos']);
    }

    /** Les photos sont privées comme les objets : un inconnu ne les voit pas, ni ne peut en ajouter. */
    public function testPhotosArePrivate(): void
    {
        $rafael = $this->signUp('rafael');
        $thomas = $this->signUp('thomas');
        $item = $this->call('POST', '/api/items', $rafael, ['name' => 'Perceuse', 'room' => $this->roomOf($rafael)])->toArray();
        $photo = $this->upload($item['@id'].'/photos', $rafael)->toArray();

        $this->call('GET', $photo['url'], $thomas);
        self::assertResponseStatusCodeSame(404, 'on ne révèle pas qu\'une photo existe');
        $this->upload($item['@id'].'/photos', $thomas);
        self::assertResponseStatusCodeSame(403);
        $this->client->request('GET', $photo['url']);
        self::assertResponseStatusCodeSame(401, 'jamais sans jeton');
    }

    public function testOnlyImagesAreAccepted(): void
    {
        $rafael = $this->signUp('rafael');
        $item = $this->call('POST', '/api/items', $rafael, ['name' => 'Perceuse', 'room' => $this->roomOf($rafael)])->toArray();

        // Le type est lu dans les octets : un texte nommé .png est refusé.
        $this->upload($item['@id'].'/photos', $rafael, 'pas une image');
        self::assertResponseStatusCodeSame(400);
        $this->call('POST', $item['@id'].'/photos', $rafael);
        self::assertResponseStatusCodeSame(400);
    }

    private function upload(string $url, array $user, ?string $bytes = null): ResponseInterface
    {
        $path = tempnam(sys_get_temp_dir(), 'photo');
        file_put_contents($path, $bytes ?? base64_decode(self::PNG));

        return $this->client->request('POST', $url, [
            'headers' => ['Authorization' => 'Bearer '.$user['token'], 'Accept' => 'application/json'],
            'extra' => ['files' => ['image' => new UploadedFile($path, 'photo.png', 'image/png', null, true)]],
        ]);
    }
}
