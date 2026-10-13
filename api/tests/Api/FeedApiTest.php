<?php

namespace App\Tests\Api;

use App\Entity\Identity\Profile;
use App\Entity\Relation\Follow;
use App\Entity\Relation\Friendship;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Contracts\HttpClient\ResponseInterface;

/**
 * Le fil : un look du jour publié, vu par l'audience choisie, avec ses
 * points comme mentions. Amitiés et abonnements posés en base (pas encore
 * de route) : Bruno est ami d'Alice, Chloé la suit, Damien ne la connaît pas.
 */
final class FeedApiTest extends ApiTestBase
{
    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    private array $alice;
    private array $bruno;
    private array $chloe;
    private array $damien;

    protected function setUp(): void
    {
        parent::setUp();
        $this->alice = $this->signUp('alice');
        $this->bruno = $this->signUp('bruno');
        $this->chloe = $this->signUp('chloe');
        $this->damien = $this->signUp('damien');

        $em = static::getContainer()->get(EntityManagerInterface::class);
        $p = static fn (array $u) => $em->find(Profile::class, $u['profileId']);
        $em->persist((new Friendship($p($this->alice), $p($this->bruno)))->accept());
        $em->persist(new Follow($p($this->chloe), $p($this->alice)));
        $em->flush();
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

    /** Un look prêt d'Alice : un point sur sa veste en jean. @return array{0: array, 1: array} le look et la veste */
    private function readyLook(): array
    {
        $veste = $this->call('POST', '/api/garments', $this->alice, [
            'name' => 'Veste en jean',
            'room' => $this->roomOf($this->alice),
            'category' => $this->garmentCategoryIri('jeans'),
        ])->toArray();
        $look = $this->upload($this->alice, '/api/looks')->toArray();
        $tag = $this->upload($this->alice, $look['@id'].'/tags', ['x' => '0.4', 'y' => '0.3'])->toArray();
        $this->call('PATCH', $look['@id'].'/tags/'.$tag['id'], $this->alice, ['garment' => $veste['@id']]);
        $this->call('PATCH', $look['@id'], $this->alice, ['status' => 'READY', 'caption' => 'Lundi en jean']);
        self::assertResponseIsSuccessful();

        return [$look, $veste];
    }

    /** @return list<string> les identifiants des publications du fil */
    private function feed(array $user): array
    {
        $feed = $this->call('GET', '/api/feed', $user)->toArray();
        self::assertResponseIsSuccessful();

        return array_column($feed['posts'], 'id');
    }

    public function testFriendsSeeTheLookAndItsMentions(): void
    {
        [$look, $veste] = $this->readyLook();
        $this->call('GET', '/api/garments/'.$veste['id'], $this->bruno);
        self::assertResponseStatusCodeSame(403, 'avant la publication, la veste est privée');

        $post = $this->call('POST', $look['@id'].'/publish', $this->alice, ['audience' => 'FRIENDS'])->toArray();
        self::assertResponseStatusCodeSame(201);
        self::assertSame('Lundi en jean', $post['body'], 'la légende du look par défaut');
        self::assertSame('FRIENDS', $post['audience']);
        self::assertTrue($post['canDelete']);
        self::assertSame($post['id'], $this->call('GET', $look['@id'], $this->alice)->toArray()['post']['id']);

        // Bruno (ami) la voit, avec la mention ouvrable et la photo du look.
        self::assertSame([$post['id']], $this->feed($this->bruno));
        $seen = $this->call('GET', '/api/posts/'.$post['id'], $this->bruno)->toArray();
        self::assertFalse($seen['canDelete']);
        self::assertSame('alice', $seen['author']['username']);
        $mention = $seen['look']['tags'][0];
        self::assertSame([0.4, 0.3], [$mention['x'], $mention['y']]);
        self::assertSame('Veste en jean', $mention['garment']['name']);
        self::assertTrue($mention['garment']['canView']);
        $this->call('GET', '/api/garments/'.$veste['id'], $this->bruno);
        self::assertResponseIsSuccessful('publier partage les vêtements du look à son audience');
        $this->call('GET', $seen['photo']['url'], $this->bruno);
        self::assertResponseIsSuccessful('la photo du look se lit par l\'audience');

        // Chloé (abonnée) et Damien (inconnu) ne voient pas une publication « amis ».
        self::assertSame([], $this->feed($this->chloe));
        self::assertSame([], $this->feed($this->damien));
        $this->call('GET', '/api/posts/'.$post['id'], $this->damien);
        self::assertResponseStatusCodeSame(404);
        $this->call('GET', $seen['photo']['url'], $this->damien);
        self::assertResponseStatusCodeSame(404);

        // Alice la voit dans son fil, et sur sa page de profil avec la veste.
        self::assertSame([$post['id']], $this->feed($this->alice));
        $page = $this->call('GET', '/api/profiles/'.$this->alice['profileId'].'/page', $this->bruno)->toArray();
        self::assertTrue($page['relation']['friend']);
        self::assertSame([$post['id']], array_column($page['posts'], 'id'));
        self::assertSame(['Veste en jean'], array_column($page['garments'], 'name'));
    }

    public function testFollowersAudienceIncludesFriends(): void
    {
        [$look] = $this->readyLook();
        $post = $this->call('POST', $look['@id'].'/publish', $this->alice, ['audience' => 'FOLLOWERS', 'body' => 'Pour mes abonnés'])->toArray();

        self::assertSame([$post['id']], $this->feed($this->chloe));
        self::assertSame([$post['id']], $this->feed($this->bruno), '« abonnés » inclut les amis');
        self::assertSame([], $this->feed($this->damien));
        self::assertSame('Pour mes abonnés', $post['body']);
        self::assertFalse($post['commentsEnabled'], 'un abonné ne commente pas (MDD)');
    }

    public function testDeletingThePostMakesTheGarmentsPrivateAgain(): void
    {
        [$look, $veste] = $this->readyLook();
        $post = $this->call('POST', $look['@id'].'/publish', $this->alice, ['audience' => 'FRIENDS'])->toArray();

        $this->call('POST', $look['@id'].'/publish', $this->alice, ['audience' => 'FRIENDS']);
        self::assertResponseStatusCodeSame(422, 'un look ne se publie qu\'une fois');
        $this->call('PATCH', $look['@id'], $this->alice, ['status' => 'TAGGING']);
        self::assertResponseStatusCodeSame(422, 'un look publié ne se modifie plus');

        $this->call('DELETE', '/api/posts/'.$post['id'], $this->bruno);
        self::assertResponseStatusCodeSame(403, 'seul l\'auteur supprime');
        $this->call('DELETE', '/api/posts/'.$post['id'], $this->alice);
        self::assertResponseStatusCodeSame(204);

        self::assertSame([], $this->feed($this->bruno));
        $this->call('GET', '/api/garments/'.$veste['id'], $this->bruno);
        self::assertResponseStatusCodeSame(403, 'le partage porté par la publication est révoqué');
        self::assertNull($this->call('GET', $look['@id'], $this->alice)->toArray()['post']);

        $this->call('DELETE', $look['@id'], $this->alice);
        self::assertResponseStatusCodeSame(422, 'sa photo reste celle de la publication');
    }

    public function testOnlyAReadyLookIsPublished(): void
    {
        $look = $this->upload($this->alice, '/api/looks')->toArray();
        $this->call('POST', $look['@id'].'/publish', $this->alice, ['audience' => 'FRIENDS']);
        self::assertResponseStatusCodeSame(422, 'un look en préparation');

        $this->call('POST', $look['@id'].'/publish', $this->alice, ['audience' => 'EVERYONE']);
        self::assertResponseStatusCodeSame(400);
        $this->call('POST', $look['@id'].'/publish', $this->bruno, ['audience' => 'FRIENDS']);
        self::assertResponseStatusCodeSame(404, 'le look d\'un autre');
    }
}
