<?php

namespace App\Tests\Api;

use App\Entity\Inventory\Scan;
use App\Enum\Inventory\ScanStatus;
use App\Tests\Support\OpenRouterMock;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Contracts\HttpClient\ResponseInterface;

/**
 * POST /api/scans/analyze, avec un OpenRouter simulé (tests/Support/OpenRouterMock) :
 * le premier Gemma répond toujours 429, chaque scan passe donc par le fallback.
 */
final class ScanApiTest extends ApiTestBase
{
    /** Un PNG de 1 × 1 pixel. */
    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    protected function tearDown(): void
    {
        OpenRouterMock::$down = false;
        parent::tearDown();
    }

    private function upload(array $user, string $kind, string $bytes): ResponseInterface
    {
        $path = tempnam(sys_get_temp_dir(), 'scan');
        file_put_contents($path, $bytes);

        return $this->client->request('POST', '/api/scans/analyze', [
            'headers' => ['Authorization' => 'Bearer '.$user['token'], 'Content-Type' => 'multipart/form-data'],
            'extra' => [
                'parameters' => ['kind' => $kind],
                'files' => ['image' => new UploadedFile($path, 'photo.png', 'image/png', null, true)],
            ],
        ]);
    }

    private function lastScan(): Scan
    {
        $em = static::getContainer()->get(EntityManagerInterface::class);

        return $em->getRepository(Scan::class)->findOneBy([], ['createdAt' => 'DESC']);
    }

    public function testPhotoIsRecognisedThroughTheFallback(): void
    {
        $alice = $this->signUp('alice');
        $body = $this->upload($alice, 'PHOTO', base64_decode(self::PNG))->toArray();

        self::assertResponseStatusCodeSame(201);
        self::assertSame('SUCCESS', $body['status']);
        self::assertSame('google/gemma-4-26b-a4b-it:free', $body['model'], 'le 1er Gemma est à court de quota, le 2e répond');
        $s = $body['suggestion'];
        self::assertSame('GARMENT', $s['type']);
        self::assertSame('Jean slim bleu', $s['name']);
        self::assertSame($this->garmentCategoryIri('jeans'), $s['category']['iri']);
        self::assertSame(['Bleu marine'], array_column($s['colors'], 'name'), 'une couleur hors référentiel est écartée');

        $scan = $this->lastScan();
        self::assertSame(ScanStatus::Success, $scan->getStatus());
        self::assertSame('openrouter', $scan->getProvider());
        self::assertCount(1, $scan->getRawData()['attempts']);
    }

    public function testTextileLabelIsRead(): void
    {
        $alice = $this->signUp('alice');
        $s = $this->upload($alice, 'LABEL_OCR', base64_decode(self::PNG))->toArray()['suggestion'];

        self::assertResponseStatusCodeSame(201);
        self::assertSame('W32 L34', $s['size']);
        self::assertSame([['material' => 'coton', 'percent' => 99], ['material' => 'élasthanne', 'percent' => 1]], $s['composition']);
        self::assertSame('Levi\'s', $s['brand']['name']);
        self::assertSame('Turquie', $s['madeIn']);
    }

    public function testAllModelsDownIsRecordedAsFailed(): void
    {
        OpenRouterMock::$down = true;
        $alice = $this->signUp('alice');
        $body = $this->upload($alice, 'PHOTO', base64_decode(self::PNG))->toArray();

        self::assertResponseStatusCodeSame(201);
        self::assertSame('FAILED', $body['status']);
        self::assertNull($body['suggestion']);
        self::assertNotNull($body['error']);
        self::assertCount(4, $this->lastScan()->getRawData()['attempts'], 'la trace garde l\'échec de chaque modèle');
    }

    public function testRejectsWhatIsNotAnImage(): void
    {
        $alice = $this->signUp('alice');
        $this->upload($alice, 'PHOTO', 'pas une image');
        self::assertResponseStatusCodeSame(400);
    }

    public function testBarcodeIsDecodedByTheApp(): void
    {
        $alice = $this->signUp('alice');
        $this->upload($alice, 'BARCODE', base64_decode(self::PNG));
        self::assertResponseStatusCodeSame(422);
    }

    public function testRequiresAnAccount(): void
    {
        $this->client->request('POST', '/api/scans/analyze');
        self::assertResponseStatusCodeSame(401);
    }
}
