<?php

namespace App\Tests\Integration;

use App\Entity\Identity\Account;
use App\Entity\Identity\ApprovalRequest;
use App\Entity\Identity\Profile;
use App\Entity\Identity\ProfilePermission;
use App\Entity\Media\Media;
use App\Enum\Identity\ApprovalStatus;
use App\Enum\Identity\Permission;
use App\Enum\Identity\PermissionMode;
use App\Enum\Identity\ProfileType;
use App\Security\PermissionResolver;

final class IdentityTest extends DatabaseTestCase
{
    public function testAdultAndChildWithGuardianAreValid(): void
    {
        $rafael = $this->profile('rafael');
        $lea = $this->child('lea', $rafael);

        $this->assertValid($rafael);
        $this->assertValid($lea);
        self::assertSame($rafael->getAccount(), $lea->getAccount());
    }

    public function testGuardianshipRules(): void
    {
        $rafael = $this->profile('rafael');
        $lea = $this->child('lea', $rafael);
        $other = $this->profile('paul');
        $account = $rafael->getAccount();
        $child = static fn (?Profile $guardian, string $birth = '2014-01-01') => new Profile($account, ProfileType::Child, 'X', 'Y', new \DateTimeImmutable($birth), 'x'.random_int(1000, 9999), $guardian);

        $this->assertInvalid($child(null), 'doit avoir un tuteur');
        $this->assertInvalid($child($lea), 'profil adulte');
        $this->assertInvalid($child($other), 'même compte');
        $this->assertInvalid($child($rafael, '2000-01-01'), 'plus de 18 ans');
    }

    public function testUsernameFormatAndUniqueness(): void
    {
        $this->profile('rafael');
        $account = new Account('x@exemple.fr');

        $this->assertInvalid(new Profile($account, ProfileType::Adult, 'B', 'T', new \DateTimeImmutable('1990-01-01'), 'Bob Majuscule'), 'Minuscules');
        $this->assertInvalid(new Profile($account, ProfileType::Adult, 'B', 'T', new \DateTimeImmutable('1990-01-01'), 'rafael'), 'déjà pris');
        $this->assertInvalid(new Profile($account, ProfileType::Adult, 'B', 'T', new \DateTimeImmutable('1990-01-01'), 'profil.supprime'), 'déjà pris');
    }

    public function testAccountIsValidAndKeepsRoleUser(): void
    {
        $account = (new Account('valid@exemple.fr'))->setRoles([Account::ROLE_ADMIN]);

        $this->assertValid($account);
        self::assertContains(Account::ROLE_USER, $account->getRoles());
        self::assertTrue($account->isAdmin());
    }

    public function testPermissionResolverCombinesDefaultAndOverride(): void
    {
        $rafael = $this->profile('rafael');
        $lea = $this->child('lea', $rafael);
        $resolver = self::getContainer()->get(PermissionResolver::class);

        self::assertSame(PermissionMode::RequiresApproval, $resolver->resolve($lea, Permission::ShareCreate));
        self::assertSame(PermissionMode::Denied, $resolver->resolve($lea, Permission::Purchase));
        self::assertSame(PermissionMode::Allowed, $resolver->resolve($rafael, Permission::Purchase));

        $this->persist(new ProfilePermission($lea, Permission::ShareCreate, PermissionMode::Allowed, $rafael));
        self::assertSame(PermissionMode::Allowed, $resolver->resolve($lea, Permission::ShareCreate));
    }

    public function testApprovalRequestIsAddressedToTheGuardianAndDecidedOnce(): void
    {
        $rafael = $this->profile('rafael');
        $lea = $this->child('lea', $rafael);

        $request = new ApprovalRequest($lea, Permission::FriendAdd, ['addressee' => 'paul']);
        self::assertSame($rafael, $request->getApprover());
        $this->persist($request->approve('ok'));
        self::assertSame(ApprovalStatus::Approved, $request->getStatus());

        $this->expectException(\LogicException::class);
        $request->reject();
    }

    public function testApprovalRequestNeedsAGuardian(): void
    {
        $this->expectException(\LogicException::class);
        new ApprovalRequest($this->profile('rafael'), Permission::FriendAdd);
    }

    public function testGhostExistsAndCannotLogIn(): void
    {
        $ghost = $this->ghost();

        self::assertTrue($ghost->isGhost());
        self::assertTrue($ghost->getAccount()->isGhost());
        self::assertSame('', $ghost->getAccount()->getPassword(), 'mot de passe vide : ne correspond à aucun hash');
    }

    public function testDatabaseGuardsGuardianship(): void
    {
        $rafael = $this->profile('rafael');
        $this->child('lea', $rafael);
        $a = $rafael->getAccount()->getId();
        $insert = fn (string $id, string $type, string $guardian = 'NULL', string $birth = "'2010-01-01'", string $default = 'false') => "INSERT INTO profile (id, account_id, guardian_id, first_name, last_name, date_of_birth, username, display_name, type, is_default, created_at, updated_at) VALUES ('$id', '$a', $guardian, 'X', 'Y', $birth, 'u".substr($id, -8)."', 'X', '$type', $default, now(), now())";

        $this->assertDbRejects($insert('01900000-0000-7000-8000-000000000001', 'CHILD'), 'chk_profile_child_has_guardian');
        $this->assertDbRejects($insert('01900000-0000-7000-8000-000000000002', 'ADULT', "'01900000-0000-7000-8000-000000000002'"), 'chk_profile_not_own_guardian');
        $this->assertDbRejects($insert('01900000-0000-7000-8000-000000000003', 'ADULT', 'NULL', "'2999-01-01'"), 'chk_profile_birth_in_past');
        $this->assertDbRejects($insert('01900000-0000-7000-8000-000000000005', 'ALIEN'), 'chk_profile_type');
        $this->assertDbRejects("DELETE FROM profile WHERE id = '{$rafael->getId()}'", 'foreign key');
    }

    public function testOneDefaultProfilePerAccount(): void
    {
        $rafael = $this->profile('rafael');
        $rafael->setIsDefault(true);
        $lea = $this->child('lea', $rafael);
        $this->em->flush();

        $this->assertDbRejects("UPDATE profile SET is_default = true WHERE id = '{$lea->getId()}'", 'uniq_profile_default_per_account');
    }

    public function testPermissionSetTwiceIsRejected(): void
    {
        $rafael = $this->profile('rafael');
        $lea = $this->child('lea', $rafael);
        $this->persist(new ProfilePermission($lea, Permission::Sell, PermissionMode::Denied, $rafael));

        $this->assertDbRejects("INSERT INTO profile_permission (id, profile_id, updated_by_id, permission, mode, created_at, updated_at) VALUES ('01900000-0000-7000-8000-000000000009', '{$lea->getId()}', '{$rafael->getId()}', 'SELL', 'ALLOWED', now(), now())", 'uniq_profile_permission');
        $this->assertDbRejects("UPDATE profile_permission SET mode = 'MAYBE'", 'chk_profile_permission_mode');
    }

    public function testDeletingAChildDeletesItsPermissionsAndReassignmentUnblocksDeletion(): void
    {
        $rafael = $this->profile('rafael');
        $lea = $this->child('lea', $rafael);
        $jo = $this->profile('jo', ProfileType::Relative, null, $rafael->getAccount(), '1960-01-01');
        $this->persist(new ProfilePermission($lea, Permission::ShareCreate, PermissionMode::Allowed, $rafael));
        $this->persist(new ProfilePermission($jo, Permission::Sell, PermissionMode::Denied, $rafael));

        $this->conn->executeStatement("DELETE FROM profile WHERE id = '{$lea->getId()}'");
        self::assertSame(0, (int) $this->fetchOne("SELECT count(*) FROM profile_permission WHERE profile_id = '{$lea->getId()}'"));

        // Rafael a réglé une permission de Jo : sa suppression est bloquée tant que la
        // référence n'est pas réaffectée au profil fantôme.
        $this->assertDbRejects("DELETE FROM profile WHERE id = '{$rafael->getId()}'", 'foreign key');
        $this->conn->executeStatement("UPDATE profile_permission SET updated_by_id = '".Profile::GHOST_ID."' WHERE updated_by_id = '{$rafael->getId()}'");
        $this->conn->executeStatement("DELETE FROM profile WHERE id = '{$rafael->getId()}'");
        self::assertSame(Profile::GHOST_ID, $this->fetchOne('SELECT updated_by_id FROM profile_permission'));
    }

    public function testMediaPathIsUnique(): void
    {
        $rafael = $this->profile('rafael');
        $this->persist(new Media($rafael, 'items/a.jpg', 'image/jpeg', 100));

        $this->assertDbRejects("INSERT INTO media (id, owner_id, path, mime_type, size_bytes, kind, created_at, updated_at) VALUES ('01900000-0000-7000-8000-0000000000aa', '{$rafael->getId()}', 'items/a.jpg', 'image/jpeg', 1, 'PHOTO', now(), now())", 'uniq_6a2ca10cb548b0f');
        $this->assertDbRejects("UPDATE media SET size_bytes = 0", 'chk_media_size_positive');
    }
}
