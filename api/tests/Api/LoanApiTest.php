<?php

namespace App\Tests\Api;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Item;
use App\Entity\Inventory\LocationHistory;
use App\Entity\Notification\Notification;
use App\Entity\Relation\Friendship;
use App\Entity\Sale\Listing;
use App\Enum\Inventory\MoveReason;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Le prêt d'objets (/api/loans) : Alice prête à Bruno, son ami. Chaque
 * geste est réservé à la bonne partie, l'objet change de disponibilité au
 * bon moment, et le journal garde tout.
 *
 * @phpstan-import-type TestUser from ApiTestBase
 */
final class LoanApiTest extends ApiTestBase
{
    /** @var TestUser */
    private array $alice;
    /** @var TestUser */
    private array $bruno;
    /** @var TestUser */
    private array $chloe;

    private string $room;

    protected function setUp(): void
    {
        parent::setUp();
        $this->alice = $this->signUp('alice');
        $this->bruno = $this->signUp('bruno');
        $this->chloe = $this->signUp('chloe');
        $this->room = $this->roomOf($this->alice);

        $em = static::getContainer()->get(EntityManagerInterface::class);
        $p = static fn (array $u) => $em->find(Profile::class, $u['profileId']);
        $em->persist((new Friendship($p($this->alice), $p($this->bruno)))->accept());
        $em->flush();
    }

    /** @return array<string, mixed> */
    private function item(string $name = 'Perceuse', string $condition = 'GOOD'): array
    {
        $item = $this->call('POST', '/api/items', $this->alice, ['name' => $name, 'room' => $this->room, 'condition' => $condition])->toArray();
        self::assertResponseStatusCodeSame(201);

        return $item;
    }

    /**
     * @param TestUser                  $user
     * @param array<string, mixed>|null $body
     *
     * @return array<string, mixed>
     */
    private function post(string $url, array $user, ?array $body = [], int $expected = 200): array
    {
        $response = $this->call('POST', $url, $user, $body ?? []);
        self::assertSame($expected, $response->getStatusCode(), (string) ($response->toArray(false)['detail'] ?? ''));

        return $response->toArray(false);
    }

    /** @return array<string, mixed> */
    private function lend(string $iri, ?string $dueDate = null): array
    {
        return $this->post('/api/loans', $this->alice, ['possession' => $iri, 'borrower' => $this->bruno['profileId'], 'dueDate' => $dueDate], 201);
    }

    /** @return array<string, mixed> */
    private function itemNow(string $iri): array
    {
        return $this->call('GET', $iri, $this->alice)->toArray();
    }

    public function testTheWholeLoan(): void
    {
        $perceuse = $this->item();
        $due = (new \DateTimeImmutable('+14 days'))->format('Y-m-d');

        $loan = $this->lend($perceuse['@id'], $due);
        self::assertSame('ACCEPTED', $loan['status'], 'le propriétaire prête de lui-même : accepté d\'emblée');
        self::assertSame('lender', $loan['role']);
        self::assertSame($due, $loan['dueDate']);
        self::assertSame('AVAILABLE', $this->itemNow($perceuse['@id'])['availability'], 'pas encore remis');

        $loan = $this->post('/api/loans/'.$loan['id'].'/received', $this->bruno);
        self::assertSame('ACTIVE', $loan['status']);
        self::assertSame('GOOD', $loan['conditionAtStart'], 'l\'état au départ est noté');
        $now = $this->itemNow($perceuse['@id']);
        self::assertSame('LENT', $now['availability']);
        self::assertSame(['loan' => $loan['id'], 'borrower' => 'Bruno', 'dueDate' => $due, 'overdue' => false], $now['lentTo'], '« Chez Bruno »');

        $this->post('/api/loans/'.$loan['id'].'/declare-return', $this->bruno, ['note' => 'Déposée chez ta mère']);
        $loan = $this->post('/api/loans/'.$loan['id'].'/confirm-return', $this->alice, ['condition' => 'WORN']);
        self::assertSame('RETURNED', $loan['status']);
        self::assertTrue($loan['damaged'], 'rendue plus usée qu\'au départ');
        self::assertSame(['ACCEPTED', 'RECEIVED', 'RETURN_DECLARED', 'RETURNED', 'DAMAGE_REPORTED'], array_column($loan['events'], 'type'));
        $now = $this->itemNow($perceuse['@id']);
        self::assertSame('AVAILABLE', $now['availability']);
        self::assertSame('WORN', $now['condition'], 'l\'état constaté devient celui de l\'objet');
        self::assertArrayNotHasKey('lentTo', $now);

        $history = $this->call('GET', '/api/possessions/loans?possession='.urlencode($perceuse['@id']), $this->alice)->toArray();
        self::assertSame([$loan['id']], array_column($history, 'id'));
        $this->call('GET', '/api/possessions/loans?possession='.urlencode($perceuse['@id']), $this->bruno);
        self::assertResponseStatusCodeSame(404, 'Bruno ne voit pas la perceuse hors du prêt');
    }

    public function testEachGestureBelongsToOneSide(): void
    {
        $loan = $this->lend($this->item()['@id']);
        $this->post('/api/loans/'.$loan['id'].'/received', $this->alice, [], 422);
        $this->post('/api/loans/'.$loan['id'].'/received', $this->bruno);
        $this->post('/api/loans/'.$loan['id'].'/confirm-return', $this->bruno, [], 422);
        $this->post('/api/loans/'.$loan['id'].'/lost', $this->bruno, [], 422);
        

        $this->call('GET', '/api/loans/'.$loan['id'], $this->chloe);
        self::assertResponseStatusCodeSame(404, 'Chloé ne participe pas à ce prêt');
        $this->post('/api/loans/'.$loan['id'].'/lost', $this->chloe, [], 404);
    }

    public function testOnlyToAFriendOrTheHousehold(): void
    {
        $iri = $this->item()['@id'];
        $this->post('/api/loans', $this->alice, ['possession' => $iri, 'borrower' => $this->chloe['profileId']], 404);
        $this->post('/api/loans', $this->alice, ['possession' => $iri, 'borrower' => $this->alice['profileId']], 422);
        $this->post('/api/loans', $this->bruno, ['possession' => $iri, 'borrower' => $this->bruno['profileId']], 404);

        $candidates = $this->call('GET', '/api/loans/candidates', $this->alice)->toArray();
        self::assertSame([['id' => $this->bruno['profileId'], 'displayName' => 'Bruno', 'username' => 'bruno', 'household' => false]], $candidates);
    }

    public function testNeverTwiceAtTheSameTime(): void
    {
        $iri = $this->item()['@id'];
        $loan = $this->lend($iri);
        self::assertStringContainsString('déjà promis à Bruno', $this->post('/api/loans', $this->alice, ['possession' => $iri, 'borrower' => $this->bruno['profileId']], 409)['detail']);

        $this->post('/api/loans/'.$loan['id'].'/received', $this->bruno);
        self::assertStringContainsString('déjà chez Bruno', $this->post('/api/loans', $this->alice, ['possession' => $iri, 'borrower' => $this->bruno['profileId']], 409)['detail'], 'un objet prêté ne se re-prête pas');
    }

    public function testAskingToBorrow(): void
    {
        $tente = $this->item('Tente');
        $this->post('/api/loans/request', $this->bruno, ['possession' => $tente['@id']], 404);
        $this->post('/api/shares', $this->alice, ['targetType' => 'ITEM', 'targetId' => $tente['id'], 'audience' => 'FRIENDS'], 201);

        $request = $this->post('/api/loans/request', $this->bruno, ['possession' => $tente['@id'], 'note' => 'Pour le week-end ?'], 201);
        self::assertSame('REQUESTED', $request['status']);
        self::assertSame('borrower', $request['role']);
        $this->post('/api/loans/request', $this->bruno, ['possession' => $tente['@id']], 409);
        $this->post('/api/loans/'.$request['id'].'/accept', $this->bruno, [], 422);

        $em = static::getContainer()->get(EntityManagerInterface::class);
        $notified = $em->getRepository(Notification::class)->findBy(['recipient' => $this->alice['profileId']]);
        self::assertSame(['Bruno aimerait emprunter « Tente »'], array_map(static fn (Notification $n) => $n->getTitle(), $notified));

        $due = (new \DateTimeImmutable('+3 days'))->format('Y-m-d');
        $accepted = $this->post('/api/loans/'.$request['id'].'/accept', $this->alice, ['dueDate' => $due]);
        self::assertSame(['ACCEPTED', $due], [$accepted['status'], $accepted['dueDate']]);

        $mine = $this->call('GET', '/api/loans?role=borrower&open=1', $this->bruno)->toArray();
        self::assertSame([$request['id']], array_column($mine, 'id'));
        self::assertSame([], $this->call('GET', '/api/loans?role=lender', $this->bruno)->toArray());
    }

    public function testDeclining(): void
    {
        $tente = $this->item('Tente');
        $this->post('/api/shares', $this->alice, ['targetType' => 'ITEM', 'targetId' => $tente['id'], 'audience' => 'FRIENDS'], 201);
        $request = $this->post('/api/loans/request', $this->bruno, ['possession' => $tente['@id']], 201);

        $declined = $this->post('/api/loans/'.$request['id'].'/decline', $this->alice, ['reason' => 'Je pars avec']);
        self::assertSame('DECLINED', $declined['status']);
        self::assertSame(['reason' => 'Je pars avec'], $declined['events'][1]['payload']);
        self::assertSame([], $this->call('GET', '/api/loans?open=1', $this->bruno)->toArray());
        self::assertCount(1, $this->call('GET', '/api/loans?open=0', $this->bruno)->toArray(), 'l\'historique garde la demande refusée');
    }

    public function testDueDateAndLateness(): void
    {
        $loan = $this->lend($this->item()['@id']);
        $this->post('/api/loans/'.$loan['id'].'/received', $this->bruno);
        $this->post('/api/loans', $this->alice, ['possession' => $this->item('Scie')['@id'], 'borrower' => $this->bruno['profileId'], 'dueDate' => '2020-01-01'], 422);
        $this->post('/api/loans/'.$loan['id'].'/due-date', $this->alice, ['dueDate' => '31/12/2099'], 400);
        $this->post('/api/loans/'.$loan['id'].'/due-date', $this->bruno, ['dueDate' => '2099-12-31'], 422);

        $later = $this->post('/api/loans/'.$loan['id'].'/due-date', $this->alice, ['dueDate' => '2099-12-31']);
        self::assertSame('2099-12-31', $later['dueDate']);
        self::assertSame(['old' => null, 'new' => '2099-12-31'], end($later['events'])['payload']);
        $none = $this->post('/api/loans/'.$loan['id'].'/due-date', $this->alice, ['dueDate' => null]);
        self::assertNull($none['dueDate'], 'retour prévu : non défini');
        self::assertFalse($none['overdue']);
    }

    public function testLostAndCancelled(): void
    {
        $perceuse = $this->item();
        $loan = $this->lend($perceuse['@id']);
        self::assertSame('CANCELLED', $this->post('/api/loans/'.$loan['id'].'/cancel', $this->bruno)['status'], 'l\'un ou l\'autre annule avant la remise');

        $loan = $this->lend($perceuse['@id']);
        $this->post('/api/loans/'.$loan['id'].'/received', $this->bruno);
        self::assertSame('LOST', $this->post('/api/loans/'.$loan['id'].'/lost', $this->alice)['status']);
        self::assertSame('LOST', $this->itemNow($perceuse['@id'])['availability']);
        $this->post('/api/loans', $this->alice, ['possession' => $perceuse['@id'], 'borrower' => $this->bruno['profileId']], 422);
    }

    public function testPutAwayElsewhereOnReturn(): void
    {
        $perceuse = $this->item();
        $cave = $this->call('POST', '/api/rooms', $this->alice, ['place' => $this->call('GET', $this->room, $this->alice)->toArray()['place'], 'name' => 'Cave', 'type' => 'CELLAR'])->toArray();
        self::assertResponseStatusCodeSame(201);
        $loan = $this->lend($perceuse['@id']);
        $this->post('/api/loans/'.$loan['id'].'/received', $this->bruno);

        $this->post('/api/loans/'.$loan['id'].'/confirm-return', $this->bruno, ['room' => $cave['@id']], 422);
        $this->post('/api/loans/'.$loan['id'].'/confirm-return', $this->alice, ['room' => $this->roomOf($this->chloe)], 403);
        $this->post('/api/loans/'.$loan['id'].'/confirm-return', $this->alice, ['room' => $cave['@id']]);

        self::assertSame($cave['@id'], $this->itemNow($perceuse['@id'])['room']);
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $moves = $em->getRepository(LocationHistory::class)->findBy(['item' => $perceuse['id']]);
        self::assertCount(1, $moves);
        self::assertSame(MoveReason::LoanReturn, $moves[0]->getReason());
        self::assertSame('Garage', $moves[0]->getRoom()->getName(), 'l\'historique garde l\'emplacement quitté');
    }

    public function testNoLoanWhileForSale(): void
    {
        $velo = $this->item('Vélo');
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $em->persist((new Listing($em->find(Item::class, $velo['id']), '80.00'))->publish());
        $em->flush();

        self::assertStringContainsString('en vente', $this->post('/api/loans', $this->alice, ['possession' => $velo['@id'], 'borrower' => $this->bruno['profileId']], 409)['detail']);
    }

    public function testAChildLendsWithTheGuardiansConsent(): void
    {
        $noe = $this->call('POST', '/api/account/profiles', $this->alice, ['type' => 'CHILD', 'firstName' => 'Noé', 'dateOfBirth' => '2017-05-02'])->toArray();
        self::assertResponseStatusCodeSame(201);
        $velo = $this->call('POST', '/api/items', $this->alice, ['name' => 'Vélo', 'room' => $this->roomOf($this->alice, $noe['id'])], $noe['id'])->toArray();
        self::assertResponseStatusCodeSame(201);

        $this->call('POST', '/api/loans', $this->alice, ['possession' => $velo['@id'], 'borrower' => $this->alice['profileId']], $noe['id']);
        self::assertResponseStatusCodeSame(403, 'LOAN_LEND demande l\'accord du tuteur');

        // Alice prête au profil de son enfant : le foyer fait partie des candidats.
        $candidates = $this->call('GET', '/api/loans/candidates', $this->alice)->toArray();
        self::assertSame([['Bruno', false], ['Noé', true]], array_map(static fn (array $c) => [$c['displayName'], $c['household']], $candidates));
        $loan = $this->post('/api/loans', $this->alice, ['possession' => $this->item()['@id'], 'borrower' => $noe['id']], 201);
        self::assertSame('lender', $this->call('GET', '/api/loans/'.$loan['id'], $this->alice)->toArray()['role']);
    }
}
