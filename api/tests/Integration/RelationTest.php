<?php

namespace App\Tests\Integration;

use App\Entity\Identity\ApprovalRequest;
use App\Entity\Relation\Follow;
use App\Entity\Relation\Friendship;
use App\Enum\Identity\Permission;
use App\Enum\Relation\FriendshipStatus;
use App\Repository\Relation\FriendshipRepository;

final class RelationTest extends DatabaseTestCase
{
    public function testFriendshipLifecycleReusesThePairAfterADecline(): void
    {
        $rafael = $this->profile('rafael');
        $thomas = $this->profile('thomas');
        $repo = self::getContainer()->get(FriendshipRepository::class);

        $f = new Friendship($rafael, $thomas);
        $this->persist($f);
        self::assertSame($f, $repo->findBetween($thomas, $rafael), 'la paire se retrouve dans les deux sens');
        self::assertFalse($repo->areFriends($rafael, $thomas));

        $f->decline();
        $f->requestAgain($thomas);
        self::assertSame($thomas, $f->getRequester());
        self::assertNull($f->getRespondedAt());

        $f->accept();
        $this->em->flush();
        self::assertTrue($repo->areFriends($thomas, $rafael));
        self::assertSame($thomas, $f->getOther($rafael));
    }

    public function testAcceptedFriendshipCannotBeRequestedAgain(): void
    {
        $f = new Friendship($this->profile('rafael'), $this->profile('thomas'));
        $f->accept();

        $this->expectException(\LogicException::class);
        $f->requestAgain($f->getRequester());
    }

    public function testNoRelationWithSelfOrGhost(): void
    {
        $rafael = $this->profile('rafael');
        foreach ([fn () => new Friendship($rafael, $rafael), fn () => new Friendship($rafael, $this->ghost()), fn () => new Follow($rafael, $rafael)] as $attempt) {
            try {
                $attempt();
                self::fail('Relation interdite acceptée.');
            } catch (\LogicException) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function testChildFriendRequestCarriesTheGuardianApproval(): void
    {
        $rafael = $this->profile('rafael');
        $lea = $this->child('lea', $rafael);
        $approval = new ApprovalRequest($lea, Permission::FriendAdd);
        $f = new Friendship($lea, $this->profile('thomas'), $approval);
        $this->persist($approval, $f);

        self::assertSame($rafael, $f->getApprovalRequest()?->getApprover());
        self::assertSame(FriendshipStatus::Pending, $f->getStatus());
    }

    public function testDatabaseGuardsPairsAndSelfRelations(): void
    {
        $rafael = $this->profile('rafael');
        $thomas = $this->profile('thomas');
        $this->persist(new Friendship($rafael, $thomas), new Follow($rafael, $thomas));
        $r = $rafael->getId();
        $t = $thomas->getId();
        $insert = fn (string $id, $a, $b) => "INSERT INTO friendship (id, requester_id, addressee_id, status, requested_at, created_at, updated_at) VALUES ('$id', '$a', '$b', 'PENDING', now(), now(), now())";

        $this->assertDbRejects($insert('01900000-0000-7000-8000-0000000000a1', $r, $t), 'uniq_friendship_pair');
        $this->assertDbRejects($insert('01900000-0000-7000-8000-0000000000a2', $t, $r), 'uniq_friendship_pair');
        $this->assertDbRejects($insert('01900000-0000-7000-8000-0000000000a3', $r, $r), 'chk_friendship_not_self');
        $this->assertDbRejects("UPDATE friendship SET status = 'ACCEPTED'", 'chk_friendship_responded');
        $this->assertDbRejects("INSERT INTO follow (id, follower_id, following_id, created_at, updated_at) VALUES ('01900000-0000-7000-8000-0000000000b1', '$r', '$t', now(), now())", 'uniq_follow_pair');
        $this->assertDbRejects("INSERT INTO follow (id, follower_id, following_id, created_at, updated_at) VALUES ('01900000-0000-7000-8000-0000000000b2', '$t', '$t', now(), now())", 'chk_follow_not_self');
    }

    public function testDuplicateFollowIsRejectedByValidation(): void
    {
        $rafael = $this->profile('rafael');
        $thomas = $this->profile('thomas');
        $this->persist(new Follow($rafael, $thomas));

        $this->assertInvalid(new Follow($rafael, $thomas), 'suis déjà');
    }

    public function testRelationsLeaveWithTheProfile(): void
    {
        $rafael = $this->profile('rafael');
        $thomas = $this->profile('thomas');
        $this->persist(new Friendship($thomas, $rafael), new Follow($thomas, $rafael));

        $this->conn->executeStatement("DELETE FROM profile WHERE id = '{$thomas->getId()}'");
        self::assertSame(0, (int) $this->fetchOne('SELECT count(*) FROM friendship') + (int) $this->fetchOne('SELECT count(*) FROM follow'));
    }
}
