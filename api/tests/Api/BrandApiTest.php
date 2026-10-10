<?php

namespace App\Tests\Api;

final class BrandApiTest extends ApiTestBase
{
    /** Une marque absente de la liste : créée non vérifiée, utilisable tout de suite sur un vêtement. */
    public function testProfileAddsAMissingBrand(): void
    {
        $rafael = $this->signUp('rafael');

        $brand = $this->call('POST', '/api/brands', $rafael, ['name' => '  Trapstar ']);
        self::assertResponseStatusCodeSame(201);
        $brand = $brand->toArray();
        self::assertSame('Trapstar', $brand['name']);
        self::assertSame('trapstar', $brand['slug']);
        self::assertStringStartsWith('/api/brands/', $brand['@id']);

        $garment = $this->call('POST', '/api/garments', $rafael, [
            'name' => 'Pull Trapstar',
            'room' => $this->roomOf($rafael),
            'category' => $this->garmentCategoryIri('pulls'),
            'brand' => $brand['@id'],
        ])->toArray();
        self::assertResponseStatusCodeSame(201);
        self::assertSame($brand['@id'], $garment['brand']);
    }

    /** Trouver ou créer : même slug, même marque, quelle que soit la casse ou la ponctuation. */
    public function testExistingBrandIsReturnedInsteadOfADuplicate(): void
    {
        $rafael = $this->signUp('rafael');
        $first = $this->call('POST', '/api/brands', $rafael, ['name' => 'Trapstar'])->toArray();

        $again = $this->call('POST', '/api/brands', $rafael, ['name' => 'TRAP STAR']);
        self::assertResponseStatusCodeSame(200);
        self::assertSame($first['@id'], $again->toArray()['@id']);

        // Une marque de la liste prédéfinie aussi : pas de second « Zara ».
        $zara = $this->call('POST', '/api/brands', $rafael, ['name' => 'zara'])->toArray();
        self::assertResponseStatusCodeSame(200);
        self::assertSame('Zara', $zara['name']);
    }

    /** La liste : les marques vérifiées, plus les siennes ; pas celles qu'un autre a ajoutées. */
    public function testUnverifiedBrandsAreProposedToTheirCreatorOnly(): void
    {
        $rafael = $this->signUp('rafael');
        $thomas = $this->signUp('thomas');
        $this->call('POST', '/api/brands', $rafael, ['name' => 'Trapstar']);

        self::assertContains('Trapstar', $this->brandNames($rafael));
        self::assertNotContains('Trapstar', $this->brandNames($thomas));
        self::assertContains('Zara', $this->brandNames($thomas), 'la liste vérifiée reste visible de tous');
    }

    public function testInvalidNamesAreRefused(): void
    {
        $rafael = $this->signUp('rafael');
        foreach ([[], ['name' => '   '], ['name' => '!!!'], ['name' => str_repeat('a', 81)]] as $body) {
            $response = $this->call('POST', '/api/brands', $rafael, $body);
            self::assertResponseStatusCodeSame(422);
            self::assertSame('name', $response->toArray(false)['violations'][0]['propertyPath']);
        }
        $this->client->request('POST', '/api/brands', ['json' => ['name' => 'Trapstar']]);
        self::assertResponseStatusCodeSame(401);
    }

    /** @return list<string> */
    private function brandNames(array $user): array
    {
        $names = [];
        $next = '/api/brands';
        while (null !== $next) {
            $page = $this->call('GET', $next, $user)->toArray();
            array_push($names, ...array_column($page['member'], 'name'));
            $next = $page['view']['next'] ?? null;
        }

        return $names;
    }
}
