<?php

namespace App\Tests\Integration;

use ApiPlatform\Metadata\IriConverterInterface;
use App\Enum\Inventory\ScanKind;
use App\Enum\Inventory\ScanStatus;
use App\Service\Scan\OpenRouterVision;
use App\Service\Scan\ScanAnalyzer;
use App\Service\Scan\VisionUnavailable;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

/**
 * Le statut d'un scan (réussi, partiel, échoué) selon ce que le modèle a
 * trouvé, et la marque inconnue gardée en texte. Le modèle répond ce qu'on
 * lui fait dire (MockHttpClient) ; la base et l'IRI sont les vraies.
 */
final class ScanAnalyzerTest extends DatabaseTestCase
{
    /** @param array<string, mixed> $answer */
    private function analyzer(array $answer): ScanAnalyzer
    {
        $client = new MockHttpClient(new MockResponse(json_encode(['choices' => [['message' => ['content' => json_encode($answer)]]]])), 'https://openrouter.ai/api/v1/');

        return new ScanAnalyzer(new OpenRouterVision($client, ['modele:free']), $this->em, self::getContainer()->get(IriConverterInterface::class));
    }

    public function testALabelWithOnlyABrandIsPartialAndAnUnknownBrandStaysText(): void
    {
        $result = $this->analyzer(['brand' => 'Marque Inconnue Du Référentiel'])
            ->analyze($this->profile('camille'), ScanKind::LabelOcr, 'img', 'image/jpeg');

        self::assertSame(ScanStatus::Partial, $result['scan']->getStatus());
        self::assertSame(['iri' => null, 'name' => 'Marque Inconnue Du Référentiel'], $result['suggestion']['brand']);
    }

    public function testAPhotoWithANameButNoCategoryIsPartial(): void
    {
        $result = $this->analyzer(['name' => 'Pull rayé', 'category' => 'pas-une-categorie'])
            ->analyze($this->profile('camille'), ScanKind::Photo, 'img', 'image/jpeg');

        self::assertSame(ScanStatus::Partial, $result['scan']->getStatus());
        self::assertNull($result['suggestion']['category'], 'une catégorie inventée est écartée');
    }

    public function testNoModelConfiguredIsAnOutage(): void
    {
        $this->expectException(VisionUnavailable::class);
        $this->expectExceptionMessage('Aucun modèle configuré');
        (new OpenRouterVision(new MockHttpClient(), []))->ask('?', 'img', 'image/jpeg');
    }

    public function testBarcodeIsNotAnalysedHere(): void
    {
        $this->expectException(\LogicException::class);
        $this->analyzer([])->analyze($this->profile('camille'), ScanKind::Barcode, 'img', 'image/jpeg');
    }
}
