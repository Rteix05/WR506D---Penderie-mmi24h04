<?php

namespace App\Tests\Integration;

use App\Entity\Identity\Account;
use App\Entity\Notification\DeviceToken;
use App\Entity\Notification\ModerationAction;
use App\Entity\Notification\Notification;
use App\Entity\Notification\NotificationPreference;
use App\Enum\Notification\DevicePlatform;
use App\Enum\Notification\ModerationActionType as A;
use App\Enum\Notification\ModerationTargetType as T;
use App\Enum\Notification\NotificationType as N;
use Symfony\Component\Uid\Uuid;

final class NotificationTest extends DatabaseTestCase
{
    public function testNotificationsAndPreferences(): void
    {
        $rafael = $this->profile('rafael');
        $thomas = $this->profile('thomas');
        $notification = (new Notification($rafael, N::OrderPaid, 'Thomas a payé', null, ['targetType' => 'ORDER'], $thomas))->markRead()->markPushSent();
        $this->persist($notification, new NotificationPreference($rafael, N::FollowNew, false));

        self::assertTrue($notification->isRead());
        $this->assertInvalid(new NotificationPreference($rafael, N::FollowNew), 'déjà réglé');
        $this->expectException(\LogicException::class);
        new Notification($rafael, N::FollowNew, 'x', null, [], $rafael);
    }

    public function testDeviceMovesBetweenAccounts(): void
    {
        $a = $this->profile('rafael')->getAccount();
        $b = $this->profile('thomas')->getAccount();
        $device = new DeviceToken($a, 'ExponentPushToken[abc]', DevicePlatform::Ios);
        $this->persist($device);

        $device->register($b);
        $this->em->flush();
        self::assertSame($b->getId()->toRfc4122(), $this->fetchOne('SELECT account_id FROM device_token'));
        $this->assertDbRejects("INSERT INTO device_token (id, account_id, token, platform, last_seen_at, created_at, updated_at) VALUES ('01900000-0000-7000-8000-0000000000e1', '{$a->getId()}', 'ExponentPushToken[abc]', 'IOS', now(), now(), now())", 'duplicate key');

        $this->expectException(\LogicException::class);
        new DeviceToken($this->em->find(Account::class, Account::GHOST_ID), 'tok', DevicePlatform::Android);
    }

    public function testModerationActionMatchesItsTarget(): void
    {
        $admin = $this->admin();
        $thomas = $this->profile('thomas');
        $suspension = new ModerationAction($admin, A::SuspendProfile, T::Profile, $thomas->getId(), 'Harcèlement', new \DateTimeImmutable('+7 days'));
        self::assertTrue($suspension->isInForce());
        self::assertFalse($suspension->isInForce(new \DateTimeImmutable('+8 days')));

        $forbidden = [
            fn () => new ModerationAction($thomas->getAccount(), A::Warn, T::Profile, $thomas->getId(), 'x'),
            fn () => new ModerationAction($admin, A::BanAccount, T::Profile, $thomas->getId(), 'x'),
            fn () => new ModerationAction($admin, A::HideContent, T::Profile, $thomas->getId(), 'x'),
            fn () => new ModerationAction($admin, A::Warn, T::Profile, $thomas->getId(), 'x', new \DateTimeImmutable('+1 day')),
            fn () => new ModerationAction($admin, A::SuspendProfile, T::Profile, $thomas->getId(), 'x', new \DateTimeImmutable('-1 day')),
        ];
        foreach ($forbidden as $attempt) {
            try {
                $attempt();
                self::fail('Action de modération interdite acceptée.');
            } catch (\LogicException) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function testModerationJournalIsAppendOnly(): void
    {
        $admin = $this->admin();
        $action = new ModerationAction($admin, A::HideContent, T::Comment, Uuid::v7(), 'Insultes');
        $this->persist($action);
        $id = $action->getId();

        $this->assertDbRejects("INSERT INTO moderation_action (id, admin_id, action_type, target_type, target_id, reason, created_at) VALUES ('01900000-0000-7000-8000-0000000000e3', '{$admin->getId()}', 'BAN_ACCOUNT', 'COMMENT', '$id', 'x', now())", 'chk_moderation_action_target');
        $this->assertDbRejects("UPDATE moderation_action SET reason = 'autre' WHERE id = '$id'", 'écriture seule');
        $this->assertDbRejects("DELETE FROM moderation_action WHERE id = '$id'", 'écriture seule');

        $this->conn->executeStatement("UPDATE moderation_action SET admin_id = '".Account::GHOST_ID."' WHERE id = '$id'");
        self::assertSame(Account::GHOST_ID, $this->fetchOne("SELECT admin_id FROM moderation_action WHERE id = '$id'"));
    }
}
