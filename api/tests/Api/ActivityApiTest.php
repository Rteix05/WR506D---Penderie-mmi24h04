<?php

namespace App\Tests\Api;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Item;
use App\Entity\Inventory\Scan;
use App\Entity\Loan\Loan;
use App\Enum\Inventory\ScanKind;
use App\Enum\Inventory\ScanStatus;
use Doctrine\ORM\EntityManagerInterface;

/**
 * GET /api/me/activity : les chiffres de « Mon activité », ceux du profil
 * actif seulement.
 */
final class ActivityApiTest extends ApiTestBase
{
    public function testCountsOnlyTheActiveProfileActivity(): void
    {
        $alice = $this->signUp('alice');
        $bob = $this->signUp('bob');
        $room = $this->roomOf($alice);
        $drill = $this->call('POST', '/api/items', $alice, ['name' => 'Perceuse', 'room' => $room])->toArray();
        $this->call('POST', '/api/items', $alice, ['name' => 'Tente', 'room' => $room]);
        $this->call('POST', '/api/garments', $alice, ['name' => 'Veste', 'room' => $room, 'category' => $this->garmentCategoryIri('pulls')]);
        $this->call('POST', '/api/items', $bob, ['name' => 'Raclette', 'room' => $this->roomOf($bob)]);

        $em = static::getContainer()->get(EntityManagerInterface::class);
        $aliceProfile = $em->find(Profile::class, $alice['profileId']);
        $bobProfile = $em->find(Profile::class, $bob['profileId']);
        $em->persist(new Scan($aliceProfile, ScanKind::Photo, ScanStatus::Success));
        $em->persist(new Scan($aliceProfile, ScanKind::Photo, ScanStatus::Success));
        $em->persist(new Scan($aliceProfile, ScanKind::Photo, ScanStatus::Failed));
        $em->persist(new Scan($bobProfile, ScanKind::Photo, ScanStatus::Failed));
        $loan = Loan::offer($em->find(Item::class, $drill['id']), $bobProfile, new \DateTimeImmutable('-2 days'));
        $loan->markReceived($bobProfile);
        $em->persist($loan);
        $em->flush();

        $mine = $this->call('GET', '/api/me/activity', $alice)->toArray();
        self::assertResponseIsSuccessful();
        self::assertSame(['items' => 2, 'garments' => 1, 'addedThisMonth' => 3], $mine['inventory']);
        self::assertSame(['lent' => 1, 'overdue' => 1, 'borrowed' => 0, 'returned' => 0], $mine['loans']);
        self::assertSame(['onSale' => 0, 'sold' => 0, 'bought' => 0], $mine['sales']);
        self::assertSame(['total' => 3, 'recognised' => 2, 'rate' => 67], $mine['scans']);

        $his = $this->call('GET', '/api/me/activity', $bob)->toArray();
        self::assertSame(1, $his['inventory']['items']);
        self::assertSame(1, $his['loans']['borrowed']);
        self::assertSame(0, $his['loans']['lent']);
        self::assertSame(0, $his['scans']['rate']);
    }

    public function testNoScanGivesNoRate(): void
    {
        $nina = $this->signUp('nina');
        $body = $this->call('GET', '/api/me/activity', $nina)->toArray();

        self::assertResponseIsSuccessful();
        self::assertNull($body['scans']['rate']);
        self::assertSame(0, $body['inventory']['items']);
    }

    public function testRequiresAuthentication(): void
    {
        $this->client->request('GET', '/api/me/activity');

        self::assertResponseStatusCodeSame(401);
    }
}
