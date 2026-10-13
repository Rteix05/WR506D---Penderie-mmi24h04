<?php

namespace App\Tests\Api;

use App\Entity\Dressing\WearLog;
use App\Tests\Support\OpenRouterMock;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Contracts\HttpClient\ResponseInterface;

/**
 * Le look du jour (/api/looks), avec l'OpenRouter simulé du scan : un
 * point posé sur un dressing vide donne un vêtement nouveau (« Veste en
 * jean »), sur un dressing rempli le 1er vêtement de la liste.
 */
final class LookApiTest extends ApiTestBase
{
    /** Un PNG de 1 × 1 pixel. */
    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    protected function tearDown(): void
    {
        OpenRouterMock::$down = false;
        OpenRouterMock::$box = [0.25, 0.25, 0.75, 0.75];
        parent::tearDown();
    }

    /** @param array<string, string> $fields */
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

    public function testNewGarmentIsSuggestedThenConfirmedAndWorn(): void
    {
        $alice = $this->signUp('alice');
        $look = $this->upload($alice, '/api/looks')->toArray();

        $tag = $this->upload($alice, $look['@id'].'/tags', ['x' => '0.4', 'y' => '0.3'])->toArray();
        self::assertResponseStatusCodeSame(201);
        self::assertSame('NEW', $tag['status'], 'dressing vide : un vêtement nouveau');
        self::assertNull($tag['garment']);
        self::assertSame('Veste en jean', $tag['suggestion']['name']);
        self::assertSame($this->garmentCategoryIri('jeans'), $tag['suggestion']['category']['iri']);
        self::assertSame(['Bleu marine'], array_column($tag['suggestion']['colors'], 'name'));
        self::assertSame('google/gemma-4-26b-a4b-it:free', $tag['model']);

        $this->call('PATCH', $look['@id'], $alice, ['status' => 'READY']);
        self::assertResponseStatusCodeSame(422, 'un point sans vêtement bloque le post');

        // L'utilisateur ajoute la veste à son dressing (pré-remplie par la suggestion), puis la désigne.
        $veste = $this->garment($alice, 'Veste en jean');
        $tag = $this->call('PATCH', $look['@id'].'/tags/'.$tag['id'], $alice, ['garment' => $veste['@id']])->toArray();
        self::assertResponseIsSuccessful();
        self::assertSame('CONFIRMED', $tag['status']);
        self::assertSame('Veste en jean', $tag['garment']['name']);

        $ready = $this->call('PATCH', $look['@id'], $alice, ['status' => 'READY', 'caption' => 'Lundi en jean'])->toArray();
        self::assertResponseIsSuccessful();
        self::assertSame('READY', $ready['status']);
        self::assertSame('Lundi en jean', $ready['caption']);

        $em = static::getContainer()->get(EntityManagerInterface::class);
        self::assertCount(1, $em->getRepository(WearLog::class)->findBy(['garment' => $veste['id']]), 'le look prêt note le port du jour');

        // Retour en préparation puis de nouveau prêt : pas de second port le même jour.
        $this->call('PATCH', $look['@id'], $alice, ['status' => 'TAGGING']);
        $this->call('PATCH', $look['@id'], $alice, ['status' => 'READY']);
        self::assertResponseIsSuccessful();
        self::assertCount(1, $em->getRepository(WearLog::class)->findBy(['garment' => $veste['id']]));

        $posted = $this->call('PATCH', $look['@id'], $alice, ['status' => 'POSTED'])->toArray();
        self::assertSame('POSTED', $posted['status']);
        self::assertNotNull($posted['postedAt']);

        $this->call('PATCH', $look['@id'], $alice, ['caption' => 'Autre légende']);
        self::assertResponseStatusCodeSame(422, 'un look posté ne se modifie plus');
        $this->call('PATCH', $look['@id'], $alice, ['status' => 'TAGGING']);
        self::assertResponseStatusCodeSame(422);
    }

    /** L'IA délimite le vêtement du point ; son contour revient sur la photo du look. */
    public function testTheGarmentUnderThePointIsOutlined(): void
    {
        $alice = $this->signUp('alice');
        $look = $this->upload($alice, '/api/looks')->toArray();

        // Gros plan découpé à (0,2 ; 0,1), 40 % de côté : le point (0,4 ; 0,3) en est le centre.
        $crop = ['cropX' => '0.2', 'cropY' => '0.1', 'cropW' => '0.4', 'cropH' => '0.4'];
        $tag = $this->upload($alice, $look['@id'].'/tags', ['x' => '0.4', 'y' => '0.3'] + $crop)->toArray();
        self::assertResponseStatusCodeSame(201);
        self::assertStringContainsString('au CENTRE exact', OpenRouterMock::$lastPrompt);
        self::assertSame('NEW', $tag['status']);
        self::assertFalse($tag['offTarget']);
        // [0,25 ; 0,75] du gros plan = [0,3 ; 0,5] en largeur et [0,2 ; 0,4] en hauteur sur la photo.
        self::assertEqualsWithDelta(['x0' => 0.3, 'y0' => 0.2, 'x1' => 0.5, 'y1' => 0.4], $tag['box'], 0.0001);

        // Près du bord gauche, le gros plan est décalé : la consigne donne la vraie position du point.
        $this->upload($alice, $look['@id'].'/tags', ['x' => '0.1', 'y' => '0.3', 'cropX' => '0', 'cropY' => '0.1', 'cropW' => '0.4', 'cropH' => '0.4']);
        self::assertStringContainsString('à 25 % de la largeur depuis la gauche et 50 % de la hauteur', OpenRouterMock::$lastPrompt);

        // Sans la découpe (ancienne version de l'app) : point supposé au centre, pas de contour.
        $tag = $this->upload($alice, $look['@id'].'/tags', ['x' => '0.6', 'y' => '0.6'])->toArray();
        self::assertNull($tag['box']);
        self::assertSame('NEW', $tag['status']);

        $this->upload($alice, $look['@id'].'/tags', ['x' => '0.6', 'y' => '0.6', 'cropX' => '2', 'cropY' => '0', 'cropW' => '0.4', 'cropH' => '0.4']);
        self::assertResponseStatusCodeSame(400);
    }

    /** Un contour qui ne contient pas le point : l'IA a regardé le vêtement d'à côté, on écarte sa réponse. */
    public function testAnAnswerAboutAnotherGarmentIsDiscarded(): void
    {
        $alice = $this->signUp('alice');
        $look = $this->upload($alice, '/api/looks')->toArray();
        OpenRouterMock::$box = [0.0, 0.0, 0.2, 0.2]; // le coin haut gauche, loin du centre

        $tag = $this->upload($alice, $look['@id'].'/tags', ['x' => '0.4', 'y' => '0.3', 'cropX' => '0.2', 'cropY' => '0.1', 'cropW' => '0.4', 'cropH' => '0.4'])->toArray();
        self::assertResponseStatusCodeSame(201);
        self::assertSame('UNKNOWN', $tag['status'], 'à désigner à la main plutôt que le mauvais vêtement');
        self::assertTrue($tag['offTarget']);
        self::assertNull($tag['suggestion']);
        self::assertNull($tag['box']);
    }

    public function testGarmentFromTheDressingIsRecognised(): void
    {
        $alice = $this->signUp('alice');
        $jean = $this->garment($alice, 'Jean 501');
        $look = $this->upload($alice, '/api/looks')->toArray();

        $tag = $this->upload($alice, $look['@id'].'/tags', ['x' => '0.5', 'y' => '0.7'])->toArray();
        self::assertSame('MATCHED', $tag['status']);
        self::assertSame($jean['@id'], $tag['garment']['@id']);
        self::assertNull($tag['suggestion']);

        $this->call('PATCH', $look['@id'], $alice, ['status' => 'READY']);
        self::assertResponseStatusCodeSame(422, 'une reconnaissance de l\'IA se confirme');
        $this->call('PATCH', $look['@id'].'/tags/'.$tag['id'], $alice, ['garment' => $jean['@id']]);
        $this->call('PATCH', $look['@id'], $alice, ['status' => 'READY']);
        self::assertResponseIsSuccessful();

        $this->upload($alice, $look['@id'].'/tags', ['x' => '0.1', 'y' => '0.1']);
        self::assertResponseStatusCodeSame(422, 'un look prêt ne prend plus de point');
    }

    public function testDetectionFailureLeavesTheChoiceToTheUser(): void
    {
        OpenRouterMock::$down = true;
        $alice = $this->signUp('alice');
        $look = $this->upload($alice, '/api/looks')->toArray();

        $tag = $this->upload($alice, $look['@id'].'/tags', ['x' => '0.5', 'y' => '0.5'])->toArray();
        self::assertResponseStatusCodeSame(201);
        self::assertSame('UNKNOWN', $tag['status']);
        self::assertNull($tag['model']);
    }

    public function testTagsAreValidatedAndRemovable(): void
    {
        $alice = $this->signUp('alice');
        $look = $this->upload($alice, '/api/looks')->toArray();

        $this->upload($alice, $look['@id'].'/tags', ['x' => '1.4', 'y' => '0.5']);
        self::assertResponseStatusCodeSame(422, 'hors de la photo');
        $this->upload($alice, $look['@id'].'/tags', ['y' => '0.5']);
        self::assertResponseStatusCodeSame(400);

        $tag = $this->upload($alice, $look['@id'].'/tags', ['x' => '0.2', 'y' => '0.5'])->toArray();
        $this->call('DELETE', $look['@id'].'/tags/'.$tag['id'], $alice);
        self::assertResponseStatusCodeSame(204);
        self::assertSame([], $this->call('GET', $look['@id'], $alice)->toArray()['tags']);
    }

    public function testALookIsPrivate(): void
    {
        $alice = $this->signUp('alice');
        $bob = $this->signUp('bob');
        $look = $this->upload($alice, '/api/looks')->toArray();
        $tag = $this->upload($alice, $look['@id'].'/tags', ['x' => '0.2', 'y' => '0.5'])->toArray();

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
