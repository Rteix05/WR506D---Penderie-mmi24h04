<?php

namespace App\Tests\Api;

/**
 * Déplacer (/api/…/move) : un objet, un conteneur avec son contenu, un
 * meuble avec ses conteneurs. L'emplacement quitté reste dans
 * l'historique ; un PATCH ne déplace jamais.
 *
 * @phpstan-import-type TestUser from ApiTestBase
 */
final class MoveApiTest extends ApiTestBase
{
    /** @var TestUser */
    private array $alice;

    private string $garage;
    /** @var array<string, mixed> */
    private array $cave;

    protected function setUp(): void
    {
        parent::setUp();
        $this->alice = $this->signUp('alice');
        $this->garage = $this->roomOf($this->alice);
        $place = $this->call('GET', $this->garage, $this->alice)->toArray()['place'];
        $this->cave = $this->create('/api/rooms', ['place' => $place, 'name' => 'Cave', 'type' => 'CELLAR']);
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>
     */
    private function create(string $url, array $body): array
    {
        $created = $this->call('POST', $url, $this->alice, $body)->toArray();
        self::assertResponseStatusCodeSame(201);

        return $created;
    }

    /**
     * @param TestUser|null        $user
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>
     */
    private function move(string $url, array $body, int $expected = 200, ?array $user = null): array
    {
        $response = $this->call('POST', $url.'/move', $user ?? $this->alice, $body);
        self::assertSame($expected, $response->getStatusCode(), (string) ($response->toArray(false)['detail'] ?? ''));

        return $response->toArray(false);
    }

    /** @return array<string, mixed> */
    private function get(string $iri): array
    {
        return $this->call('GET', $iri, $this->alice)->toArray();
    }

    public function testMovingAnItemLeavesATrace(): void
    {
        $perceuse = $this->create('/api/items', ['name' => 'Perceuse', 'room' => $this->garage]);
        $etagere = $this->create('/api/storages', ['room' => $this->cave['@id'], 'name' => 'Étagère', 'type' => 'SHELF']);

        $moved = $this->move($perceuse['@id'], ['room' => $this->cave['@id'], 'storage' => $etagere['@id']]);
        self::assertSame([$this->cave['@id'], $etagere['@id'], null], [$moved['room'], $moved['storage'], $moved['box']]);
        self::assertSame($this->cave['@id'], $this->get($perceuse['@id'])['room']);

        $history = $this->call('GET', '/api/possessions/moves?possession='.urlencode($perceuse['@id']), $this->alice)->toArray();
        self::assertCount(1, $history);
        self::assertSame(['Garage', 'Maison', null, null, 'MANUAL_MOVE', 'Alice'], [
            $history[0]['room']['name'], $history[0]['room']['place'], $history[0]['storage'], $history[0]['box'], $history[0]['reason'], $history[0]['movedBy'],
        ], 'l\'historique garde l\'emplacement QUITTÉ');

        $this->move($perceuse['@id'], ['room' => $this->cave['@id'], 'storage' => $etagere['@id']]);
        self::assertCount(1, $this->call('GET', '/api/possessions/moves?possession='.urlencode($perceuse['@id']), $this->alice)->toArray(), 'même place : rien à tracer');
    }

    public function testABoxImposesItsPlace(): void
    {
        $carton = $this->create('/api/boxes', ['room' => $this->cave['@id'], 'name' => 'Carton Noël', 'type' => 'CARTON']);
        $guirlande = $this->create('/api/garments', ['name' => 'Pull de Noël', 'room' => $this->garage, 'category' => $this->garmentCategoryIri('jeans')]);

        $moved = $this->move($guirlande['@id'], ['box' => $carton['@id']]);
        self::assertSame([$this->cave['@id'], $carton['@id']], [$moved['room'], $moved['box']], 'sans room : la pièce du carton');
    }

    public function testInconsistentOrForbiddenDestinations(): void
    {
        $perceuse = $this->create('/api/items', ['name' => 'Perceuse', 'room' => $this->garage]);
        $etagere = $this->create('/api/storages', ['room' => $this->cave['@id'], 'name' => 'Étagère', 'type' => 'SHELF']);
        $this->move($perceuse['@id'], [], 400);
        self::assertStringContainsString('pas dans cette pièce', $this->move($perceuse['@id'], ['room' => $this->garage, 'storage' => $etagere['@id']], 422)['detail']);

        $bruno = $this->signUp('bruno');
        $this->move($perceuse['@id'], ['room' => $this->roomOf($bruno)], 403);
        $this->move($perceuse['@id'], ['room' => $this->cave['@id']], 404, $bruno);
    }

    public function testMovingABoxMovesItsContents(): void
    {
        $etagere = $this->create('/api/storages', ['room' => $this->garage, 'name' => 'Étagère', 'type' => 'SHELF']);
        $carton = $this->create('/api/boxes', ['room' => $this->garage, 'storage' => $etagere['@id'], 'name' => 'Carton Bricolage', 'type' => 'CARTON']);
        $vis = $this->create('/api/items', ['name' => 'Boîte de vis', 'room' => $this->garage, 'box' => $carton['@id']]);
        $niveau = $this->create('/api/items', ['name' => 'Niveau', 'room' => $this->garage, 'box' => $carton['@id']]);

        $moved = $this->move($carton['@id'], ['room' => $this->cave['@id']]);
        self::assertSame([$this->cave['@id'], null], [$moved['room'], $moved['storage']]);
        foreach ([$vis, $niveau] as $item) {
            $now = $this->get($item['@id']);
            self::assertSame([$this->cave['@id'], null, $carton['@id']], [$now['room'], $now['storage'] ?? null, $now['box']], $item['name'].' suit son carton');
            $history = $this->call('GET', '/api/possessions/moves?possession='.urlencode($item['@id']), $this->alice)->toArray();
            self::assertSame(['BOX_MOVED', 'Étagère'], [$history[0]['reason'], $history[0]['storage']['name']]);
        }
    }

    public function testMovingAStorageMovesEverythingOnIt(): void
    {
        $armoire = $this->create('/api/storages', ['room' => $this->garage, 'name' => 'Armoire', 'type' => 'WARDROBE']);
        $boite = $this->create('/api/boxes', ['room' => $this->garage, 'storage' => $armoire['@id'], 'name' => 'Boîte à chaussures', 'type' => 'BIN']);
        $drap = $this->create('/api/items', ['name' => 'Drap', 'room' => $this->garage, 'storage' => $armoire['@id']]);

        $this->move($armoire['@id'], ['room' => $this->cave['@id']]);
        self::assertSame($this->cave['@id'], $this->get($armoire['@id'])['room']);
        self::assertSame([$this->cave['@id'], $armoire['@id']], [$this->get($boite['@id'])['room'], $this->get($boite['@id'])['storage']], 'le conteneur suit son meuble');
        self::assertSame([$this->cave['@id'], $armoire['@id']], [$this->get($drap['@id'])['room'], $this->get($drap['@id'])['storage']]);
    }

    public function testAPatchNeverMoves(): void
    {
        $perceuse = $this->create('/api/items', ['name' => 'Perceuse', 'room' => $this->garage]);
        $this->call('PATCH', $perceuse['@id'], $this->alice, ['room' => $this->cave['@id']]);
        self::assertSame($this->garage, $this->get($perceuse['@id'])['room']);
    }
}
