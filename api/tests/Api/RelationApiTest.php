<?php

namespace App\Tests\Api;

use App\Entity\Identity\Profile;
use App\Entity\Identity\ProfilePermission;
use App\Entity\Inventory\Item;
use App\Entity\Loan\Loan;
use App\Entity\Notification\DeviceToken;
use App\Entity\Place\Room;
use App\Enum\Identity\Permission;
use App\Enum\Identity\PermissionMode;
use App\Enum\Notification\DevicePlatform;
use App\Tests\Support\HttpMock;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Component\Console\Tester\ApplicationTester;

/**
 * Amis, abonnements, accord du tuteur ; et le lien entre les notifications
 * de l'app et le push (Expo simulé par HttpMock), avec les rappels de prêt.
 */
final class RelationApiTest extends ApiTestBase
{
    protected function setUp(): void
    {
        parent::setUp();
        HttpMock::reset();
    }

    /**
     * @param array<string, mixed> $user
     *
     * @return list<string> les titres des notifications du profil
     */
    private function titles(array $user): array
    {
        return array_column($this->call('GET', '/api/notifications', $user)->toArray()['notifications'], 'title');
    }

    public function testAskAcceptAndUnfriend(): void
    {
        $alice = $this->signUp('alice');
        $bob = $this->signUp('bob');

        self::assertSame(['bob'], array_column($this->call('GET', '/api/people/search?q=bo', $alice)->toArray()['profiles'], 'username'));

        $request = $this->call('POST', '/api/friends/requests', $alice, ['profile' => $bob['profileId']])->toArray();
        self::assertResponseStatusCodeSame(201);
        self::assertSame(['Demande d’ami'], $this->titles($bob));
        self::assertCount(1, $this->call('GET', '/api/friends/requests', $bob)->toArray()['received']);
        $this->call('POST', '/api/friends/requests', $alice, ['profile' => $bob['profileId']]);
        self::assertResponseStatusCodeSame(409, 'une seule demande à la fois');

        $this->call('POST', '/api/friends/requests/'.$request['id'].'/accept', $alice);
        self::assertResponseStatusCodeSame(404, 'on n’accepte pas sa propre demande');
        $this->call('POST', '/api/friends/requests/'.$request['id'].'/accept', $bob);
        self::assertResponseIsSuccessful();
        self::assertSame(['Nouvel ami'], $this->titles($alice));
        self::assertSame(['bob'], array_column($this->call('GET', '/api/friends', $alice)->toArray()['friends'], 'username'));
        self::assertTrue($this->call('GET', '/api/profiles/'.$bob['profileId'].'/page', $alice)->toArray()['relation']['friend']);

        $this->call('DELETE', '/api/friends/'.$alice['profileId'], $bob);
        self::assertResponseStatusCodeSame(204);
        self::assertSame([], $this->call('GET', '/api/friends', $alice)->toArray()['friends']);
    }

    public function testCrossedRequestsBecomeFriends(): void
    {
        $alice = $this->signUp('alice');
        $bob = $this->signUp('bob');
        $this->call('POST', '/api/friends/requests', $alice, ['profile' => $bob['profileId']]);
        $this->call('POST', '/api/friends/requests', $bob, ['profile' => $alice['profileId']]);
        self::assertResponseStatusCodeSame(200);

        self::assertCount(1, $this->call('GET', '/api/friends', $bob)->toArray()['friends']);
    }

    public function testFollowAndMutualFollow(): void
    {
        $alice = $this->signUp('alice');
        $bob = $this->signUp('bob');
        $this->call('POST', '/api/follows', $alice, ['profile' => $bob['profileId']]);
        self::assertResponseStatusCodeSame(201);
        self::assertSame(['Nouvel abonné'], $this->titles($bob));

        $this->call('POST', '/api/follows', $bob, ['profile' => $alice['profileId']]);
        self::assertSame(['Abonnement mutuel'], $this->titles($alice));
        $page = $this->call('GET', '/api/profiles/'.$alice['profileId'].'/page', $bob)->toArray()['relation'];
        self::assertTrue($page['following']);
        self::assertTrue($page['followsMe']);

        $this->call('DELETE', '/api/follows/'.$bob['profileId'], $alice);
        self::assertSame([], $this->call('GET', '/api/follows', $alice)->toArray()['following']);
    }

    public function testAChildsRequestWaitsForTheGuardian(): void
    {
        $parent = $this->signUp('parent');
        $bob = $this->signUp('bob');
        $child = $this->call('POST', '/api/account/profiles', $parent, ['type' => 'CHILD', 'firstName' => 'Noé', 'dateOfBirth' => '2017-05-02'])->toArray();
        self::assertResponseStatusCodeSame(201);
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $em->persist(new ProfilePermission($em->find(Profile::class, $child['id']), Permission::FriendAdd, PermissionMode::RequiresApproval, $em->find(Profile::class, $parent['profileId'])));
        $em->flush();

        $request = $this->call('POST', '/api/friends/requests', $parent, ['profile' => $bob['profileId']], $child['id'])->toArray();
        self::assertResponseStatusCodeSame(201);
        self::assertSame([], $this->titles($bob), 'pas encore présentée à Bob');
        self::assertSame(['Demande pour Noé'], $this->titles($parent));

        $approval = $this->call('GET', '/api/approvals', $parent)->toArray()['approvals'][0];
        $this->call('POST', '/api/approvals/'.$approval['id'].'/approve', $parent);
        self::assertResponseIsSuccessful();
        self::assertSame(['Demande d’ami'], $this->titles($bob));
        self::assertSame($request['id'], $this->call('GET', '/api/friends/requests', $bob)->toArray()['received'][0]['id']);
    }

    public function testNotificationsAlsoGoOutAsPushAndRemindersAreSentOnce(): void
    {
        $alice = $this->signUp('alice');
        $bob = $this->signUp('bob');
        $this->call('PUT', '/api/device-tokens', $bob, ['token' => 'ExponentPushToken[bob-phone]', 'platform' => 'IOS']);
        self::assertResponseStatusCodeSame(204);

        // Une notification dans l'app = un push, avec le profil visé et de quoi ouvrir l'écran.
        $this->call('POST', '/api/follows', $alice, ['profile' => $bob['profileId']]);
        self::assertCount(1, HttpMock::pushes());
        self::assertSame('ExponentPushToken[bob-phone]', HttpMock::pushes()[0]['to']);
        self::assertSame('Nouvel abonné', HttpMock::pushes()[0]['title']);
        self::assertSame($bob['profileId'], HttpMock::pushes()[0]['data']['profileId']);
        self::assertSame($alice['profileId'], HttpMock::pushes()[0]['data']['profile']);

        // Couper le push « social » : la notification reste dans l'app, rien ne part sur le téléphone.
        $this->call('PUT', '/api/notification-preferences', $bob, ['group' => 'social', 'push' => false]);
        $this->call('DELETE', '/api/follows/'.$bob['profileId'], $alice);
        $this->call('POST', '/api/follows', $alice, ['profile' => $bob['profileId']]);
        self::assertCount(1, HttpMock::pushes());
        self::assertCount(2, $this->titles($bob));

        // Rappel de prêt la veille du retour, pour les deux ; relancé, rien de plus.
        $roomIri = $this->roomOf($alice);
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $room = $em->find(Room::class, basename($roomIri));
        \assert(null !== $room);
        $drill = new Item($em->find(Profile::class, $alice['profileId']), 'Perceuse', $room);
        $em->persist($drill);
        $loan = Loan::offer($drill, $em->find(Profile::class, $bob['profileId']), new \DateTimeImmutable('tomorrow'));
        $loan->markReceived($em->find(Profile::class, $bob['profileId']));
        $em->persist($loan);
        $em->persist(new DeviceToken($em->find(Profile::class, $alice['profileId'])->getAccount(), 'ExponentPushToken[alice-gone]', DevicePlatform::Android));
        $em->flush();

        $app = new Application(static::$kernel);
        $app->setAutoExit(false);
        $tester = new ApplicationTester($app);
        $tester->run(['command' => 'app:loans:remind']);
        $tester->run(['command' => 'app:loans:remind']);

        self::assertCount(1, array_filter($this->titles($bob), static fn ($t) => 'Rappel de retour' === $t));
        self::assertContains('Rappel de retour', $this->titles($alice));
        $pushes = HttpMock::pushes();
        self::assertSame('Rappel de retour', $pushes[\count($pushes) - 1]['title'], 'le rappel part aussi en push');
        self::assertNull($em->getRepository(DeviceToken::class)->findOneBy(['token' => 'ExponentPushToken[alice-gone]']), 'un appareil désinscrit est oublié');
    }
}
