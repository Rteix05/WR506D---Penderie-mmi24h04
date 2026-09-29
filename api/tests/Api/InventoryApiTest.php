<?php

namespace App\Tests\Api;

use App\Entity\Identity\Profile;
use App\Enum\Identity\ProfileType;
use Doctrine\ORM\EntityManagerInterface;

final class InventoryApiTest extends ApiTestBase
{
    public function testOwnerIsTheActiveProfileNeverTheClient(): void
    {
        $rafael = $this->signUp('rafael');
        $thomas = $this->signUp('thomas');
        $room = $this->roomOf($rafael);

        $item = $this->call('POST', '/api/items', $rafael, [
            'name' => 'Perceuse',
            'room' => $room,
            'owner' => '/api/profiles/'.$thomas['profileId'],
        ])->toArray();
        self::assertResponseStatusCodeSame(201);

        $em = static::getContainer()->get(EntityManagerInterface::class);
        self::assertSame($rafael['profileId'], (string) $em->getConnection()->fetchOne('SELECT owner_id FROM item WHERE id = ?', [$item['id']]), 'le propriétaire envoyé par le client est ignoré');
        self::assertArrayNotHasKey('owner', $item);
    }

    public function testEachProfileOnlySeesItsOwnItems(): void
    {
        $rafael = $this->signUp('rafael');
        $thomas = $this->signUp('thomas');
        $mine = $this->call('POST', '/api/items', $rafael, ['name' => 'Perceuse', 'room' => $this->roomOf($rafael)])->toArray();
        $this->call('POST', '/api/items', $thomas, ['name' => 'Tente', 'room' => $this->roomOf($thomas)]);

        $list = $this->call('GET', '/api/items', $rafael)->toArray();
        self::assertSame(['Perceuse'], array_column($list['member'], 'name'));

        $this->call('GET', $mine['@id'], $thomas);
        self::assertResponseStatusCodeSame(403);
        $this->call('PATCH', $mine['@id'], $thomas, ['name' => 'Volée']);
        self::assertResponseStatusCodeSame(403);
        $this->call('DELETE', $mine['@id'], $thomas);
        self::assertResponseStatusCodeSame(403);
    }

    public function testCannotStoreInSomeoneElsesRoom(): void
    {
        $rafael = $this->signUp('rafael');
        $thomas = $this->signUp('thomas');

        $this->call('POST', '/api/items', $thomas, ['name' => 'Intrus', 'room' => $this->roomOf($rafael)]);
        self::assertResponseStatusCodeSame(403);
    }

    public function testPatchAndSoftDelete(): void
    {
        $rafael = $this->signUp('rafael');
        $item = $this->call('POST', '/api/items', $rafael, ['name' => 'Perceuse', 'room' => $this->roomOf($rafael)])->toArray();

        $patched = $this->call('PATCH', $item['@id'], $rafael, ['name' => 'Perceuse Bosch', 'condition' => 'GOOD'])->toArray();
        self::assertResponseIsSuccessful();
        self::assertSame('Perceuse Bosch', $patched['name']);
        self::assertSame('GOOD', $patched['condition']);

        $this->call('PATCH', $item['@id'], $rafael, ['condition' => 'EXPLODED']);
        self::assertResponseStatusCodeSame(400);

        $this->call('DELETE', $item['@id'], $rafael);
        self::assertResponseStatusCodeSame(204);
        self::assertCount(0, $this->call('GET', '/api/items', $rafael)->toArray()['member'], 'supprimé en douceur : absent des listes');
        $em = static::getContainer()->get(EntityManagerInterface::class);
        self::assertNotNull($em->getConnection()->fetchOne('SELECT deleted_at FROM item WHERE id = ?', [$item['id']]), 'la ligne reste');
    }

    public function testGuardianSeesAndManagesChildItems(): void
    {
        $rafael = $this->signUp('rafael');
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $guardian = $em->find(Profile::class, $rafael['profileId']);
        $lea = new Profile($guardian->getAccount(), ProfileType::Child, 'Léa', 'T', new \DateTimeImmutable('2016-03-12'), 'lea', $guardian);
        $em->persist($lea);
        $em->flush();
        $leaId = (string) $lea->getId();

        $parentItem = $this->call('POST', '/api/items', $rafael, ['name' => 'Perceuse', 'room' => $this->roomOf($rafael)])->toArray();
        $console = $this->call('POST', '/api/items', $rafael, ['name' => 'Console', 'room' => $this->roomOf($rafael, $leaId)], $leaId)->toArray();
        self::assertResponseStatusCodeSame(201, 'un enfant crée ses objets (ITEM_CREATE autorisé par défaut)');

        self::assertEqualsCanonicalizing(['Perceuse', 'Console'], array_column($this->call('GET', '/api/items', $rafael)->toArray()['member'], 'name'), 'le tuteur voit les objets de l\'enfant');
        self::assertSame(['Console'], array_column($this->call('GET', '/api/items', $rafael, null, $leaId)->toArray()['member'], 'name'), 'l\'enfant ne voit que les siens');

        $this->call('GET', $parentItem['@id'], $rafael, null, $leaId);
        self::assertResponseStatusCodeSame(403);
        $this->call('PATCH', $console['@id'], $rafael, ['name' => 'Console de Léa']);
        self::assertResponseIsSuccessful();
    }

    public function testGarmentWithCategorySizeAndColors(): void
    {
        $rafael = $this->signUp('rafael');
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $size = static fn (string $code, string $label) => '/api/size_values/'.$em->getConnection()->fetchOne("SELECT v.id FROM size_value v JOIN size_system s ON s.id = v.size_system_id WHERE s.code = '$code' AND v.label = '$label'");
        $blue = '/api/colors/'.$em->getConnection()->fetchOne("SELECT id FROM color WHERE name = 'Bleu marine'");
        $room = $this->roomOf($rafael);

        $jean = $this->call('POST', '/api/garments', $rafael, [
            'name' => 'Jean 501',
            'room' => $room,
            'category' => $this->garmentCategoryIri('jeans'),
            'size' => $size('WAIST_LENGTH', 'W32 L34'),
            'colors' => [$blue],
        ])->toArray();
        self::assertResponseStatusCodeSame(201);
        self::assertSame([$blue], $jean['colors']);

        $this->call('POST', '/api/garments', $rafael, [
            'name' => 'Jean mal taillé',
            'room' => $room,
            'category' => $this->garmentCategoryIri('jeans'),
            'size' => $size('ALPHA', 'M'),
        ]);
        self::assertResponseStatusCodeSame(422, 'une taille M sur un jean (échelle W/L) est refusée par la validation');
    }

    public function testReferenceDataIsReadable(): void
    {
        $rafael = $this->signUp('rafael');

        $categories = $this->call('GET', '/api/garment_categories', $rafael)->toArray();
        self::assertGreaterThan(0, $categories['totalItems']);
        $this->call('GET', '/api/brands', $rafael);
        self::assertResponseIsSuccessful();
        $this->call('POST', '/api/brands', $rafael, ['name' => 'Pirate']);
        self::assertResponseStatusCodeSame(405, 'les référentiels sont en lecture seule');
    }
}
