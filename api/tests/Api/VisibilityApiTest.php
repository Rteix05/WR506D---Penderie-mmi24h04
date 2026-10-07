<?php

namespace App\Tests\Api;

use App\Entity\Identity\Profile;
use App\Entity\Relation\Follow;
use App\Entity\Relation\Friendship;
use Doctrine\ORM\EntityManagerInterface;

/**
 * La séance 8 à travers l'API, avec de vraies requêtes : Camille partage,
 * Sophie (amie), Hugo (abonné) et Paul (inconnu) regardent ; puis
 * « voler les affaires du voisin » (partie 4).
 *
 * Il n'y a pas encore de route pour les amitiés et les abonnements : on
 * les pose directement en base.
 */
final class VisibilityApiTest extends ApiTestBase
{
    private array $camille;
    private array $sophie;
    private array $hugo;
    private array $paul;

    protected function setUp(): void
    {
        parent::setUp();
        $this->camille = $this->signUp('camille');
        $this->sophie = $this->signUp('sophie');
        $this->hugo = $this->signUp('hugo');
        $this->paul = $this->signUp('paul');

        $em = $this->em();
        $p = static fn (array $u) => $em->find(Profile::class, $u['profileId']);
        $em->persist((new Friendship($p($this->camille), $p($this->sophie)))->accept());
        $em->persist(new Follow($p($this->hugo), $p($this->camille)));
        $em->flush();
    }

    private function em(): EntityManagerInterface
    {
        return static::getContainer()->get(EntityManagerInterface::class);
    }

    /** @return array<string, mixed> */
    private function item(array $user, string $name, string $room, array $extra = []): array
    {
        $item = $this->call('POST', '/api/items', $user, ['name' => $name, 'room' => $room, ...$extra])->toArray();
        self::assertResponseStatusCodeSame(201);

        return $item;
    }

    private function code(string $method, string $url, array $user, ?array $json = null): int
    {
        return $this->call($method, $url, $user, $json)->getStatusCode();
    }

    /** @return array<string, mixed> */
    private function share(array $user, string $type, string $id, string $audience, array $extra = []): array
    {
        $share = $this->call('POST', '/api/shares', $user, ['targetType' => $type, 'targetId' => $id, 'audience' => $audience, ...$extra])->toArray();
        self::assertResponseStatusCodeSame(201);

        return $share;
    }

    private function roomId(string $iri): string
    {
        return basename($iri);
    }

    // ─── Partie 4 : voler les affaires du voisin ──────────────────────

    public function testStealingTheNeighboursThings(): void
    {
        $room = $this->roomOf($this->camille);
        $tente = $this->item($this->camille, 'Tente 4 places', $room, ['notes' => 'code du cadenas : 1234', 'estimatedValue' => '350.00']);
        $mine = $this->item($this->paul, 'Vélo', $this->roomOf($this->paul));

        // 1. Lire l'objet de quelqu'un d'autre par son identifiant.
        self::assertSame(403, $this->code('GET', $tente['@id'], $this->paul));
        // 2. Le modifier.
        self::assertSame(403, $this->code('PATCH', $tente['@id'], $this->paul, ['name' => 'Ma tente']));
        self::assertSame(403, $this->code('DELETE', $tente['@id'], $this->paul));
        // 3. Donner son propre objet à quelqu'un d'autre (ou se l'approprier).
        $this->call('PATCH', $mine['@id'], $this->paul, ['owner' => '/api/profiles/'.$this->camille['profileId']]);
        self::assertResponseIsSuccessful();
        self::assertSame($this->paul['profileId'], (string) $this->em()->getConnection()->fetchOne('SELECT owner_id FROM item WHERE id = ?', [$mine['id']]), 'owner n\'est pas modifiable');
        // … ou le ranger chez le voisin.
        self::assertSame(403, $this->code('POST', '/api/items', $this->paul, ['name' => 'Intrus', 'room' => $room]));
        // 4. La liste complète : seulement les siens.
        self::assertSame(['Vélo'], array_column($this->call('GET', '/api/items', $this->paul)->toArray()['member'], 'name'));
        // … et rien via les partages reçus.
        self::assertSame([], $this->call('GET', '/api/shares/received', $this->paul)->toArray());
        // 5. Aucune fuite dans ce qu'on reçoit de SA liste.
        $raw = $this->call('GET', '/api/items', $this->paul)->getContent();
        foreach (['Tente', '1234', '350', $this->camille['profileId'], 'camille'] as $secret) {
            self::assertStringNotContainsString($secret, $raw);
        }
        // Et on ne partage pas ce qu'on ne possède pas.
        self::assertSame(403, $this->code('POST', '/api/shares', $this->paul, ['targetType' => 'ITEM', 'targetId' => $tente['id'], 'audience' => 'LINK']));
    }

    // ─── Le tableau ──────────────────────────────────────────────────

    public function testPrivateByDefaultThenSharedWithFriends(): void
    {
        $tente = $this->item($this->camille, 'Tente', $this->roomOf($this->camille), ['notes' => 'secret', 'estimatedValue' => '350.00']);
        foreach ([$this->sophie, $this->hugo, $this->paul] as $u) {
            self::assertSame(403, $this->code('GET', $tente['@id'], $u), 'privé par défaut');
        }

        $this->share($this->camille, 'ITEM', $tente['id'], 'FRIENDS');
        $seen = $this->call('GET', $tente['@id'], $this->sophie)->toArray();
        self::assertResponseIsSuccessful();
        self::assertSame('Tente', $seen['name']);
        foreach (['notes', 'estimatedValue', 'room', 'storage', 'box', 'purchaseDate', 'source', 'personal'] as $private) {
            self::assertArrayNotHasKey($private, $seen, "$private ne regarde que la propriétaire");
        }
        self::assertSame(403, $this->code('PATCH', $tente['@id'], $this->sophie, ['name' => 'x']), 'lire n\'est pas modifier');
        self::assertSame(403, $this->code('GET', $tente['@id'], $this->hugo), 'un abonné n\'est pas un ami');
        self::assertSame(403, $this->code('GET', $tente['@id'], $this->paul));

        $own = $this->call('GET', $tente['@id'], $this->camille)->toArray();
        self::assertSame('secret', $own['notes'], 'la propriétaire voit tout');
        self::assertArrayHasKey('room', $own);

        self::assertSame(['Tente'], array_column($this->call('GET', '/api/shares/received', $this->sophie)->toArray(), 'targetName'));
    }

    public function testPersonalItemIsNeverShared(): void
    {
        $room = $this->roomOf($this->camille);
        $journal = $this->item($this->camille, 'Journal intime', $room, ['personal' => true]);
        self::assertTrue($journal['personal'], 'le drapeau est bien enregistré (il était ignoré en silence avant la séance 8)');

        self::assertSame(422, $this->code('POST', '/api/shares', $this->camille, ['targetType' => 'ITEM', 'targetId' => $journal['id'], 'audience' => 'FRIENDS']));

        // Situation 1 : la pièce entière est partagée, l'objet personnel reste caché.
        $this->item($this->camille, 'Robe d\'été', $room);
        $share = $this->share($this->camille, 'ROOM', $this->roomId($room), 'SPECIFIC', ['recipients' => [$this->sophie['profileId']]]);
        self::assertSame(200, $this->code('GET', $room, $this->sophie));
        self::assertSame(403, $this->code('GET', $journal['@id'], $this->sophie));

        $link = $this->share($this->camille, 'ROOM', $this->roomId($room), 'LINK');
        $opened = $this->client->request('GET', '/api/links/'.$link['token'])->toArray();
        self::assertSame(['Robe d\'été'], array_column($opened['items'], 'name'), 'ni par lien');
        self::assertArrayNotHasKey('token', $this->call('GET', '/api/shares/received', $this->sophie)->toArray()[0], 'le jeton ne sort que pour celle qui partage');
        unset($share);
    }

    // ─── Situation 3 : le lien transféré ─────────────────────────────

    public function testForwardedLinkIsReadOnlyAndRevocable(): void
    {
        $robe = $this->item($this->camille, 'Robe rouge', $this->roomOf($this->camille), ['notes' => 'achetée en solde', 'estimatedValue' => '80.00']);
        $link = $this->share($this->camille, 'ITEM', $robe['id'], 'LINK');

        // La sœur de Sophie ouvre le lien, sans compte.
        $response = $this->client->request('GET', '/api/links/'.$link['token']);
        self::assertResponseIsSuccessful();
        $body = $response->getContent();
        self::assertStringContainsString('Robe rouge', $body);
        foreach (['achetée', '80', 'room', 'notes'] as $private) {
            self::assertStringNotContainsString($private, $body);
        }
        // Le lien ne donne pas accès à l'objet via l'API (ni à qui que ce soit connecté).
        self::assertSame(403, $this->code('GET', $robe['@id'], $this->paul));
        // Un faux jeton : rien.
        $this->client->request('GET', '/api/links/'.str_repeat('a', 43));
        self::assertResponseStatusCodeSame(404);

        // Camille révoque : plus personne.
        self::assertSame(204, $this->code('DELETE', '/api/shares/'.$link['id'], $this->camille));
        $this->client->request('GET', '/api/links/'.$link['token']);
        self::assertResponseStatusCodeSame(404);
        // Sophie ne peut pas révoquer le partage de Camille.
        $friends = $this->share($this->camille, 'ITEM', $robe['id'], 'FRIENDS');
        self::assertSame(403, $this->code('DELETE', '/api/shares/'.$friends['id'], $this->sophie));
    }

    // ─── Situation 4 : Camille retire Sophie de ses amis ─────────────

    public function testUnfriendingRemovesAccessAtOnce(): void
    {
        $room = $this->roomOf($this->camille);
        $robe = $this->item($this->camille, 'Robe rouge', $room);
        $this->share($this->camille, 'ITEM', $robe['id'], 'FRIENDS');
        $this->share($this->camille, 'ROOM', $this->roomId($room), 'SPECIFIC', ['recipients' => [$this->sophie['profileId']], 'accessLevel' => 'EDIT']);
        self::assertSame(200, $this->code('GET', $robe['@id'], $this->sophie));

        $this->em()->getConnection()->executeStatement('DELETE FROM friendship');

        self::assertSame(403, $this->code('GET', $robe['@id'], $this->sophie));
        self::assertSame(403, $this->code('GET', $room, $this->sophie));
        self::assertSame([], $this->call('GET', '/api/shares/received', $this->sophie)->toArray());
        self::assertSame(403, $this->code('POST', '/api/contributions', $this->sophie, ['kind' => 'EDIT_FIELDS', 'targetType' => 'ITEM', 'targetId' => $robe['id'], 'changes' => ['name' => 'x']]));
    }

    // ─── Followers : lecture seule, sans « modifier » ────────────────

    public function testFollowersSeeWhatIsSharedWithFollowersOnly(): void
    {
        $look = $this->item($this->camille, 'Veste en jean', $this->roomOf($this->camille));
        $this->share($this->camille, 'ITEM', $look['id'], 'FOLLOWERS');
        self::assertSame(200, $this->code('GET', $look['@id'], $this->hugo));
        self::assertSame(403, $this->code('GET', $look['@id'], $this->paul));
        self::assertSame(422, $this->code('POST', '/api/shares', $this->camille, ['targetType' => 'ITEM', 'targetId' => $look['id'], 'audience' => 'FOLLOWERS', 'accessLevel' => 'EDIT']), 'Modifier : personnes nommées seulement');
        self::assertSame(422, $this->code('POST', '/api/shares', $this->camille, ['targetType' => 'ITEM', 'targetId' => $look['id'], 'audience' => 'SPECIFIC', 'recipients' => [$this->hugo['profileId']]]), 'nommer : ses amis seulement');
    }

    // ─── Modifier = proposer, la propriétaire valide ─────────────────

    public function testEditRightProposesAndOwnerDecides(): void
    {
        $room = $this->roomOf($this->camille);
        $robe = $this->item($this->camille, 'Robe', $room);
        $grant = $this->share($this->camille, 'ITEM', $robe['id'], 'SPECIFIC', ['recipients' => [$this->sophie['profileId']], 'accessLevel' => 'EDIT']);

        self::assertSame(403, $this->code('PATCH', $robe['@id'], $this->sophie, ['name' => 'Robe rouge']), 'jamais de modification directe');
        self::assertSame(403, $this->code('DELETE', $robe['@id'], $this->sophie), 'ni de suppression');

        $proposal = $this->call('POST', '/api/contributions', $this->sophie, ['kind' => 'EDIT_FIELDS', 'targetType' => 'ITEM', 'targetId' => $robe['id'], 'changes' => ['name' => 'Robe rouge']])->toArray();
        self::assertResponseStatusCodeSame(201);
        self::assertSame('Robe', $this->call('GET', $robe['@id'], $this->camille)->toArray()['name'], 'rien n\'est appliqué avant validation');
        self::assertSame(422, $this->code('POST', '/api/contributions', $this->sophie, ['kind' => 'EDIT_FIELDS', 'targetType' => 'ITEM', 'targetId' => $robe['id'], 'changes' => ['estimatedValue' => '1']]), 'champs hors liste refusés');

        self::assertSame(403, $this->code('POST', '/api/contributions/'.$proposal['id'].'/accept', $this->sophie), 'on ne valide pas sa propre proposition');
        self::assertCount(1, $this->call('GET', '/api/contributions', $this->camille)->toArray()['toReview']);
        $this->call('POST', '/api/contributions/'.$proposal['id'].'/accept', $this->camille);
        self::assertResponseIsSuccessful();
        self::assertSame('Robe rouge', $this->call('GET', $robe['@id'], $this->camille)->toArray()['name']);

        // Repartager : en lecture seulement, et ça reste l'objet de Camille.
        $reshare = $this->share($this->sophie, 'ITEM', $robe['id'], 'FRIENDS');
        self::assertTrue($reshare['reshare']);
        self::assertSame($this->camille['profileId'], $reshare['owner']['id']);
        self::assertSame(422, $this->code('POST', '/api/shares', $this->sophie, ['targetType' => 'ITEM', 'targetId' => $robe['id'], 'audience' => 'SPECIFIC', 'accessLevel' => 'EDIT', 'recipients' => [$this->camille['profileId']]]));
        unset($grant);
    }

    // ─── Le carton de Sophie chez Camille ────────────────────────────

    public function testPlacingAnItemInSomeoneElsesRoomNeedsTheirApproval(): void
    {
        $cave = $this->roomOf($this->camille);
        $this->share($this->camille, 'ROOM', $this->roomId($cave), 'SPECIFIC', ['recipients' => [$this->sophie['profileId']], 'accessLevel' => 'EDIT']);
        $carton = $this->item($this->sophie, 'Carton de livres', $this->roomOf($this->sophie));

        $proposal = $this->call('POST', '/api/contributions', $this->sophie, ['kind' => 'PLACE_POSSESSION', 'possessionType' => 'ITEM', 'possessionId' => $carton['id'], 'roomId' => $this->roomId($cave)])->toArray();
        self::assertResponseStatusCodeSame(201);
        self::assertSame(200, $this->code('POST', '/api/contributions/'.$proposal['id'].'/accept', $this->camille));

        $conn = $this->em()->getConnection();
        self::assertSame($this->sophie['profileId'], (string) $conn->fetchOne('SELECT owner_id FROM item WHERE id = ?', [$carton['id']]), 'le carton reste à Sophie');
        self::assertSame($this->roomId($cave), (string) $conn->fetchOne('SELECT room_id FROM item WHERE id = ?', [$carton['id']]));
        self::assertSame(200, $this->code('GET', $carton['@id'], $this->camille), 'Camille voit ce qui est rangé chez elle');
        self::assertSame(403, $this->code('PATCH', $carton['@id'], $this->camille, ['name' => 'À moi']), 'mais ne le modifie pas');
    }
}
