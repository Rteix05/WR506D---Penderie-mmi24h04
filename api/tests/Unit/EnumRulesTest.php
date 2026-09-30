<?php

namespace App\Tests\Unit;

use App\Entity\Reference\Brand;
use App\Enum\Identity\Permission;
use App\Enum\Identity\PermissionMode;
use App\Enum\Identity\ProfileType;
use App\Enum\Inventory\Condition;
use App\Enum\Notification\ModerationActionType;
use App\Enum\Notification\NotificationType;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Les règles métier portées par les énumérations et les fonctions pures.
 */
final class EnumRulesTest extends TestCase
{
    /** La matrice des permissions par défaut du MDD, ligne par ligne. */
    public static function childDefaults(): iterable
    {
        foreach ([Permission::ItemCreate, Permission::GarmentManage, Permission::CollectionCreate, Permission::MediaUpload] as $p) {
            yield $p->value => [$p, PermissionMode::Allowed];
        }
        foreach ([Permission::LoanBorrow, Permission::LoanLend, Permission::ShareCreate, Permission::FriendAdd, Permission::CommentWrite] as $p) {
            yield $p->value => [$p, PermissionMode::RequiresApproval];
        }
        foreach ([Permission::Follow, Permission::Purchase, Permission::Sell] as $p) {
            yield $p->value => [$p, PermissionMode::Denied];
        }
    }

    #[DataProvider('childDefaults')]
    public function testChildDefaultPermissions(Permission $permission, PermissionMode $expected): void
    {
        self::assertSame($expected, $permission->defaultModeFor(ProfileType::Child));
    }

    public function testAdultsAndRelativesHaveNoRestriction(): void
    {
        foreach (Permission::cases() as $permission) {
            self::assertSame(PermissionMode::Allowed, $permission->defaultModeFor(ProfileType::Adult));
            self::assertSame(PermissionMode::Allowed, $permission->defaultModeFor(ProfileType::Relative));
        }
    }

    public function testConditionWear(): void
    {
        self::assertTrue(Condition::Worn->isWorseThan(Condition::Excellent));
        self::assertFalse(Condition::Good->isWorseThan(Condition::Good));
        self::assertFalse(Condition::New->isWorseThan(Condition::Damaged));
    }

    public function testOnlyFriendsAudiencesAllowComments(): void
    {
        self::assertTrue(ShareAudience::Friends->allowsComments());
        self::assertTrue(ShareAudience::Specific->allowsComments());
        self::assertFalse(ShareAudience::Followers->allowsComments());
        self::assertFalse(ShareAudience::Link->allowsComments());
        // Modifier couvre Lire, pas l'inverse (30/09).
        self::assertTrue(AccessLevel::Edit->includes(AccessLevel::Read));
        self::assertTrue(AccessLevel::Read->includes(AccessLevel::Read));
        self::assertFalse(AccessLevel::Read->includes(AccessLevel::Edit));
    }

    public function testSaleNotificationsAreCritical(): void
    {
        $critical = array_filter(NotificationType::cases(), static fn (NotificationType $t) => $t->isSaleCritical());
        self::assertCount(4, $critical);
        self::assertCount(19, NotificationType::cases());
    }

    public function testOnlySuspensionAndBanCanExpire(): void
    {
        $expiring = array_filter(ModerationActionType::cases(), static fn (ModerationActionType $t) => $t->canExpire());
        self::assertSame([ModerationActionType::SuspendProfile, ModerationActionType::BanAccount], array_values($expiring));
    }

    /** @return iterable<string, array{string, string}> */
    public static function brands(): iterable
    {
        yield 'casse' => ['ZARA', 'zara'];
        yield 'apostrophe' => ["Levi's", 'levis'];
        yield 'espaces' => ['The North Face', 'thenorthface'];
        yield 'esperluette' => ['H&M', 'hm'];
        yield 'accent' => ['Sézane', 'sezane'];
        yield 'ligature' => ['Tape à l\'œil', 'tapealoeil'];
    }

    #[DataProvider('brands')]
    public function testBrandSlugDeduplicates(string $name, string $slug): void
    {
        self::assertSame($slug, Brand::slugify($name));
    }
}
