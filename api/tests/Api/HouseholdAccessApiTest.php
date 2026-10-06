<?php

namespace App\Tests\Api;

use App\Entity\Identity\Profile;
use App\Entity\Relation\Friendship;
use App\Enum\Identity\ProfileType;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Les colonnes « Coloc » et « Profil +18 / −18 » du tableau des droits,
 * par de vraies requêtes : colocation (invitation, pièce commune, pièce
 * fermée, suppression votée, départ), foyer, partage d'un rangement.
 */
final class HouseholdAccessApiTest extends ApiTestBase
{
    private array $camille;
    private array $marc;
    private array $sophie;

    protected function setUp(): void
    {
        parent::setUp();
        $this->camille = $this->signUp('camille');
        $this->marc = $this->signUp('marc');
        $this->sophie = $this->signUp('sophie');
        $em = $this->em();
        $p = static fn (array $u) => $em->find(Profile::class, $u['profileId']);
        $em->persist((new Friendship($p($this->camille), $p($this->marc)))->accept());
        $em->persist((new Friendship($p($this->camille), $p($this->sophie)))->accept());
        $em->flush();
    }

    private function em(): EntityManagerInterface
    {
        return static::getContainer()->get(EntityManagerInterface::class);
    }

    private function code(string $method, string $url, array $user, ?array $json = null, ?string $profileId = null): int
    {
        return $this->call($method, $url, $user, $json, $profileId)->getStatusCode();
    }

    /** @return array<string, mixed> */
    private function post(string $url, array $user, array $json, int $expected = 201, ?string $profileId = null): array
    {
        $response = $this->call('POST', $url, $user, $json, $profileId);
        self::assertSame($expected, $response->getStatusCode(), $response->getContent(false));

        return $response->toArray(false);
    }

    /** Camille crée l'appart et y fait entrer Marc (il accepte l'invitation). */
    private function flatshare(): array
    {
        $appart = $this->post('/api/places', $this->camille, ['name' => 'Appart', 'type' => 'APARTMENT']);
        $invitation = $this->post("/api/places/{$appart['id']}/decisions", $this->camille, ['kind' => 'INVITE_MEMBER', 'inviteeId' => $this->marc['profileId']]);
        self::assertSame('PENDING', $invitation['status']);
        self::assertSame(['Marc'], $invitation['awaiting']);

        $awaiting = $this->call('GET', '/api/place_decisions/awaiting', $this->marc)->toArray();
        self::assertSame([$invitation['id']], array_column($awaiting, 'id'), 'Marc voit l\'invitation qui l\'attend');
        self::assertSame('APPROVED', $this->post("/api/place_decisions/{$invitation['id']}/approve", $this->marc, [], 200)['status']);

        return $appart;
    }

    public function testFlatshareCommonAndClosedRooms(): void
    {
        $appart = $this->flatshare();
        self::assertSame(['Appart'], array_column($this->call('GET', '/api/places', $this->marc)->toArray()['member'], 'name'));
        self::assertCount(2, $this->call('GET', "/api/places/{$appart['id']}/members", $this->marc)->toArray());

        // La pièce commune : chacun la modifie directement, y range ses affaires.
        $salon = $this->post('/api/rooms', $this->camille, ['place' => $appart['@id'], 'name' => 'Salon', 'type' => 'LIVING_ROOM']);
        self::assertSame(200, $this->code('PATCH', $salon['@id'], $this->marc, ['name' => 'Grand salon']));
        $etagere = $this->post('/api/storages', $this->marc, ['room' => $salon['@id'], 'name' => 'Étagère', 'type' => 'SHELF']);
        $guitare = $this->post('/api/items', $this->marc, ['name' => 'Guitare', 'room' => $salon['@id'], 'notes' => 'cordes neuves']);

        $seen = $this->call('GET', $guitare['@id'], $this->camille)->toArray();
        self::assertSame('VIEW', $seen['access'], 'Camille voit la guitare de Marc…');
        self::assertSame($salon['@id'], $seen['room'], '… et où elle est rangée');
        self::assertArrayNotHasKey('notes', $seen, 'mais pas ses notes');
        self::assertSame(403, $this->code('PATCH', $guitare['@id'], $this->camille, ['name' => 'À moi']), 'et n\'y touche pas');
        self::assertSame('EDIT', $this->call('GET', $etagere['@id'], $this->marc)->toArray()['access'], 'Marc : modifier directement (pièce commune)');
        self::assertSame('ADMIN', $this->call('GET', $etagere['@id'], $this->camille)->toArray()['access'], 'Camille : sa pièce, donc ses rangements');

        // La pièce fermée : Marc ne la voit plus, ni dans la liste, ni par son adresse.
        $chambre = $this->post('/api/rooms', $this->camille, ['place' => $appart['@id'], 'name' => 'Chambre', 'type' => 'BEDROOM']);
        self::assertSame(422, $this->code('POST', "/api/rooms/{$chambre['id']}/close", $this->marc), 'seul le créateur ferme');
        self::assertTrue($this->post("/api/rooms/{$chambre['id']}/close", $this->camille, [], 200)['closed']);
        self::assertSame(403, $this->code('GET', $chambre['@id'], $this->marc));
        self::assertSame(['Grand salon'], array_column($this->call('GET', '/api/rooms', $this->marc)->toArray()['member'], 'name'));
        self::assertSame(403, $this->code('POST', '/api/items', $this->marc, ['name' => 'Intrus', 'room' => $chambre['@id']]));

        // Camille l'autorise : il y retrouve les droits d'une pièce commune.
        $this->post("/api/rooms/{$chambre['id']}/allowed", $this->camille, ['profileId' => $this->marc['profileId']], 200);
        self::assertSame(200, $this->code('GET', $chambre['@id'], $this->marc));
    }

    public function testDeletingInAFlatshareIsVoted(): void
    {
        $appart = $this->flatshare();
        $debarras = $this->post('/api/rooms', $this->marc, ['place' => $appart['@id'], 'name' => 'Débarras', 'type' => 'OTHER']);
        $salon = $this->post('/api/rooms', $this->camille, ['place' => $appart['@id'], 'name' => 'Salon', 'type' => 'LIVING_ROOM']);
        $this->post('/api/items', $this->camille, ['name' => 'Canapé', 'room' => $salon['@id']]);

        self::assertSame(409, $this->code('DELETE', $appart['@id'], $this->camille), 'le logement : accord de tous');
        self::assertSame(409, $this->code('DELETE', $debarras['@id'], $this->marc), 'une pièce commune : accord de tous, même pour son créateur');

        $decision = $this->post("/api/places/{$appart['id']}/decisions", $this->marc, ['kind' => 'DELETE_ROOM', 'roomId' => $debarras['id']]);
        self::assertSame(200, $this->code('GET', $debarras['@id'], $this->marc), 'pas avant le vote de Camille');
        $this->post("/api/place_decisions/{$decision['id']}/approve", $this->camille, [], 200);
        self::assertSame(404, $this->code('GET', $debarras['@id'], $this->marc));

        self::assertSame(409, $this->code('POST', "/api/places/{$appart['id']}/decisions", $this->camille, ['kind' => 'DELETE_PLACE']), 'le canapé est encore là');
    }

    public function testLeavingTheFlatshare(): void
    {
        $appart = $this->flatshare();
        $salon = $this->post('/api/rooms', $this->camille, ['place' => $appart['@id'], 'name' => 'Salon', 'type' => 'LIVING_ROOM']);
        $guitare = $this->post('/api/items', $this->marc, ['name' => 'Guitare', 'room' => $salon['@id']]);
        $studio = $this->roomOf($this->marc);

        self::assertSame(422, $this->code('POST', "/api/places/{$appart['id']}/leave", $this->marc, ['mode' => 'TAKE', 'roomId' => $salon['id']]));
        self::assertSame(204, $this->code('POST', "/api/places/{$appart['id']}/leave", $this->marc, ['mode' => 'TAKE', 'roomId' => basename($studio)]));

        self::assertSame($studio, $this->call('GET', $guitare['@id'], $this->marc)->toArray()['room'], 'la guitare est partie avec lui');
        self::assertSame(['Maison'], array_column($this->call('GET', '/api/places', $this->marc)->toArray()['member'], 'name'));
        self::assertSame(403, $this->code('GET', $salon['@id'], $this->marc));
        self::assertSame(422, $this->code('POST', "/api/places/{$appart['id']}/leave", $this->camille, ['mode' => 'TAKE']), 'la dernière occupante supprime, elle ne part pas');
    }

    public function testSharingTheCommonRoomNeverShowsAFlatmatesThings(): void
    {
        $appart = $this->flatshare();
        $salon = $this->post('/api/rooms', $this->camille, ['place' => $appart['@id'], 'name' => 'Salon', 'type' => 'LIVING_ROOM']);
        $lampe = $this->post('/api/items', $this->camille, ['name' => 'Lampe', 'room' => $salon['@id']]);
        $guitare = $this->post('/api/items', $this->marc, ['name' => 'Guitare de Marc', 'room' => $salon['@id']]);

        $this->post('/api/shares', $this->camille, ['targetType' => 'ROOM', 'targetId' => $salon['id'], 'audience' => 'FRIENDS']);
        self::assertSame(200, $this->code('GET', $lampe['@id'], $this->sophie));
        self::assertSame(403, $this->code('GET', $guitare['@id'], $this->sophie), 'Sophie est l\'amie de Camille, pas de Marc');
        self::assertSame(403, $this->code('POST', '/api/shares', $this->marc, ['targetType' => 'ROOM', 'targetId' => $salon['id'], 'audience' => 'FRIENDS']), 'seul le créateur partage la pièce');

        $link = $this->post('/api/shares', $this->camille, ['targetType' => 'ROOM', 'targetId' => $salon['id'], 'audience' => 'LINK']);
        self::assertSame(['Lampe'], array_column($this->client->request('GET', '/api/links/'.$link['token'])->toArray()['items'], 'name'));
    }

    public function testSharingOneStorage(): void
    {
        $room = $this->roomOf($this->camille);
        $etagere = $this->post('/api/storages', $this->camille, ['room' => $room, 'name' => 'Penderie d\'été', 'type' => 'WARDROBE']);
        $maillot = $this->post('/api/items', $this->camille, ['name' => 'Maillot', 'room' => $room]);
        $em = $this->em();
        $em->getConnection()->executeStatement('UPDATE item SET storage_id = ? WHERE id = ?', [$etagere['id'], $maillot['id']]);
        $pull = $this->post('/api/items', $this->camille, ['name' => 'Pull', 'room' => $room]);

        $share = $this->post('/api/shares', $this->camille, ['targetType' => 'STORAGE', 'targetId' => $etagere['id'], 'audience' => 'SPECIFIC', 'recipients' => [$this->sophie['profileId']]]);
        self::assertSame('STORAGE', $share['targetType']);
        self::assertSame(200, $this->code('GET', $etagere['@id'], $this->sophie));
        self::assertSame(200, $this->code('GET', $maillot['@id'], $this->sophie), 'ce qui est dans la penderie partagée');
        self::assertSame(403, $this->code('GET', $pull['@id'], $this->sophie), 'pas le reste de la pièce');
        self::assertSame(403, $this->code('GET', $room, $this->sophie), 'ni la pièce');
    }

    public function testHouseholdProfiles(): void
    {
        $em = $this->em();
        $camille = $em->find(Profile::class, $this->camille['profileId']);
        $leo = new Profile($camille->getAccount(), ProfileType::Adult, 'Léo', 'T', new \DateTimeImmutable('1998-05-01'), 'leo');
        $lina = new Profile($camille->getAccount(), ProfileType::Child, 'Lina', 'T', new \DateTimeImmutable('2016-03-12'), 'lina', $camille);
        $em->persist($leo);
        $em->persist($lina);
        $em->flush();
        [$leoId, $linaId] = [(string) $leo->getId(), (string) $lina->getId()];

        $room = $this->roomOf($this->camille);
        $lampe = $this->post('/api/items', $this->camille, ['name' => 'Lampe', 'room' => $room, 'notes' => 'ampoule à changer']);
        $journal = $this->post('/api/items', $this->camille, ['name' => 'Journal', 'room' => $room, 'personal' => true]);

        $asLeo = $this->call('GET', $lampe['@id'], $this->camille, null, $leoId)->toArray();
        self::assertSame('EDIT', $asLeo['access'], 'profil +18 : propose sur les objets');
        self::assertSame($room, $asLeo['room'], 'le foyer sait où est rangé un objet');
        self::assertArrayNotHasKey('notes', $asLeo, 'mais pas les notes de Camille');
        self::assertSame('VIEW', $this->call('GET', $lampe['@id'], $this->camille, null, $linaId)->toArray()['access'], 'profil −18 : voit');
        self::assertSame(403, $this->code('GET', $journal['@id'], $this->camille, null, $leoId), 'jamais le personnel');
        self::assertSame(403, $this->code('PATCH', $lampe['@id'], $this->camille, ['name' => 'x'], $leoId), 'proposer, pas modifier');

        $proposal = $this->post('/api/contributions', $this->camille, ['kind' => 'EDIT_FIELDS', 'targetType' => 'ITEM', 'targetId' => $lampe['id'], 'changes' => ['name' => 'Lampe de chevet']], 201, $leoId);
        self::assertSame('HOUSEHOLD', $proposal['basis']);
        self::assertSame(403, $this->code('POST', '/api/contributions', $this->camille, ['kind' => 'EDIT_FIELDS', 'targetType' => 'ITEM', 'targetId' => $lampe['id'], 'changes' => ['name' => 'x']], $linaId), 'un mineur ne propose pas sur les objets');
        $this->post("/api/contributions/{$proposal['id']}/accept", $this->camille, [], 200);
        self::assertSame('Lampe de chevet', $this->call('GET', $lampe['@id'], $this->camille)->toArray()['name']);
    }
}
