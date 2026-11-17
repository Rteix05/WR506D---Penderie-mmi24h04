<?php

namespace App\Tests\Api;

use App\Entity\Identity\Profile;
use App\Entity\Notification\Notification;
use App\Entity\Relation\Friendship;
use App\Enum\Notification\NotificationType;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Les notifications du profil actif : liste, non lues, lecture ; et celles
 * que crée un partage.
 */
final class NotificationApiTest extends ApiTestBase
{
    public function testListReadAndReadAll(): void
    {
        $alice = $this->signUp('alice');
        $bob = $this->signUp('bob');
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $me = $em->find(Profile::class, $alice['profileId']);
        $first = new Notification($me, NotificationType::LoanReturned, 'Objet retourné', 'Bob t’a rendu la perceuse.', ['loan' => 'x']);
        $em->persist($first);
        $em->persist(new Notification($me, NotificationType::CommentAdded, 'Nouveau commentaire', null, ['post' => 'y']));
        $em->flush();

        $list = $this->call('GET', '/api/notifications', $alice)->toArray();
        self::assertSame(2, $list['unread']);
        self::assertSame(['Nouveau commentaire', 'Objet retourné'], array_column($list['notifications'], 'title'), 'la plus récente d’abord');
        self::assertSame(['unread' => 2], $this->call('GET', '/api/notifications/unread-count', $alice)->toArray());

        $this->call('POST', '/api/notifications/'.$first->getId().'/read', $bob);
        self::assertResponseStatusCodeSame(404, 'pas la notification d’un autre');
        self::assertSame(['unread' => 1], $this->call('POST', '/api/notifications/'.$first->getId().'/read', $alice)->toArray());
        self::assertSame(['unread' => 0], $this->call('POST', '/api/notifications/read-all', $alice)->toArray());
        self::assertSame(0, $this->call('GET', '/api/notifications', $bob)->toArray()['unread']);
    }

    public function testASharedItemNotifiesTheChosenFriend(): void
    {
        $alice = $this->signUp('alice');
        $bob = $this->signUp('bob');
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $em->persist((new Friendship($em->find(Profile::class, $alice['profileId']), $em->find(Profile::class, $bob['profileId'])))->accept());
        $em->flush();
        $drill = $this->call('POST', '/api/items', $alice, ['name' => 'Perceuse', 'room' => $this->roomOf($alice)])->toArray();

        $this->call('POST', '/api/shares', $alice, ['targetType' => 'ITEM', 'targetId' => $drill['id'], 'audience' => 'SPECIFIC', 'recipients' => [$bob['profileId']]]);
        self::assertResponseStatusCodeSame(201);

        $received = $this->call('GET', '/api/notifications', $bob)->toArray()['notifications'];
        self::assertCount(1, $received);
        self::assertSame('SHARE_RECEIVED', $received[0]['type']);
        self::assertStringContainsString('« Perceuse »', (string) $received[0]['body']);
        self::assertSame(['ITEM', $drill['id']], [$received[0]['data']['targetType'], $received[0]['data']['targetId']]);
        self::assertSame(0, $this->call('GET', '/api/notifications', $alice)->toArray()['unread'], 'pas de notification à soi-même');
    }

    public function testRequiresAuthentication(): void
    {
        $this->client->request('GET', '/api/notifications');
        self::assertResponseStatusCodeSame(401);
    }
}
