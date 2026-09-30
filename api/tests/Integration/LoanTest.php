<?php

namespace App\Tests\Integration;

use App\Entity\Identity\ApprovalRequest;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Item;
use App\Entity\Loan\Loan;
use App\Entity\Loan\LoanEvent;
use App\Enum\Identity\Permission;
use App\Enum\Inventory\Availability;
use App\Enum\Inventory\Condition;
use App\Enum\Loan\LoanEventType as T;
use App\Enum\Loan\LoanStatus as S;

final class LoanTest extends DatabaseTestCase
{
    public function testFullCycleWithDamagedReturn(): void
    {
        $rafael = $this->profile('rafael');
        $thomas = $this->profile('thomas');
        $room = $this->room($rafael);
        $perceuse = (new Item($rafael, 'Perceuse', $room))->setCondition(Condition::Excellent);
        $this->persist($perceuse);

        $loan = Loan::request($perceuse, $thomas, 'Pour une étagère');
        self::assertSame($rafael, $loan->getLender(), 'le prêteur est le propriétaire, résolu automatiquement');
        $loan->accept($rafael, new \DateTimeImmutable('+7 days'));
        $loan->markReceived($thomas);
        $this->persist($loan);
        self::assertSame(Availability::Lent, $perceuse->getAvailability());
        self::assertSame($room, $perceuse->getRoom(), 'l\'emplacement habituel ne bouge pas');

        self::assertTrue($loan->isOverdue(new \DateTimeImmutable('+10 days')));
        $loan->changeDueDate($rafael, new \DateTimeImmutable('+30 days'));
        self::assertFalse($loan->isOverdue(new \DateTimeImmutable('+10 days')), 'repousser la date annule le retard');

        $loan->recordReminder()->declareReturn($thomas)->confirmReturn($rafael, Condition::Worn, 'Mandrin abîmé', ['photo-1']);
        $this->em->flush();
        self::assertSame(S::Returned, $loan->getStatus());
        self::assertSame(Availability::Available, $perceuse->getAvailability());
        self::assertSame(Condition::Worn, $perceuse->getCondition());
        self::assertTrue($loan->isDamaged());
        self::assertSame(
            [T::Requested, T::Accepted, T::Received, T::DueDateChanged, T::ReminderSent, T::ReturnDeclared, T::Returned, T::DamageReported],
            array_map(static fn (LoanEvent $e) => $e->getType(), $loan->getEvents()->toArray()),
        );
        self::assertSame(8, (int) $this->fetchOne("SELECT count(*) FROM loan_event WHERE loan_id = '{$loan->getId()}'"));
    }

    public function testOnlyTheRightPartyActs(): void
    {
        $rafael = $this->profile('rafael');
        $thomas = $this->profile('thomas');
        $loan = Loan::request(new Item($rafael, 'Perceuse', $this->room($rafael)), $thomas);

        foreach ([fn () => $loan->accept($thomas), fn () => $loan->decline($thomas)] as $attempt) {
            try {
                $attempt();
                self::fail('Geste interdit accepté.');
            } catch (\LogicException) {
                $this->addToAssertionCount(1);
            }
        }
        $loan->accept($rafael);
        $this->expectException(\LogicException::class);
        $loan->markReceived($rafael);
    }

    public function testOnlyAnAvailableItemIsLent(): void
    {
        $rafael = $this->profile('rafael');
        $thomas = $this->profile('thomas');
        $item = new Item($rafael, 'Perceuse', $this->room($rafael));

        foreach ([Availability::Lent, Availability::Borrowed, Availability::Sold, Availability::Lost] as $availability) {
            $item->setAvailability($availability);
            try {
                Loan::request($item, $thomas);
                self::fail("Un objet $availability->value a été prêté.");
            } catch (\LogicException) {
                $this->addToAssertionCount(1);
            }
        }
        $item->setAvailability(Availability::Available);
        $this->expectException(\LogicException::class);
        Loan::request($item, $rafael);
    }

    public function testOfferDeclineCancelLostAndChildLoan(): void
    {
        $rafael = $this->profile('rafael');
        $lea = $this->child('lea', $rafael);
        $thomas = $this->profile('thomas');
        $item = new Item($rafael, 'Perceuse', $this->room($rafael));
        $livre = new Item($thomas, 'Livre', $this->room($thomas));
        $this->persist($item, $livre);

        $offer = Loan::offer($item, $thomas);
        self::assertSame(S::Accepted, $offer->getStatus());
        self::assertNull($offer->getDueDate());
        $offer->cancel($thomas);
        self::assertSame(S::Cancelled, $offer->getStatus());

        $approval = new ApprovalRequest($lea, Permission::LoanBorrow);
        $childLoan = Loan::request($livre, $lea, null, $approval);
        $this->persist($approval, $offer, $childLoan);
        self::assertSame($rafael, $childLoan->getApprovalRequest()?->getApprover());

        $lost = Loan::offer($item, $thomas);
        $lost->markReceived($thomas)->declareLost($rafael);
        $this->persist($lost);
        self::assertSame(Availability::Lost, $item->getAvailability());
    }

    public function testDatabaseGuardsLoans(): void
    {
        $rafael = $this->profile('rafael');
        $thomas = $this->profile('thomas');
        $item = new Item($rafael, 'Perceuse', $this->room($rafael));
        $refused = Loan::request($item, $thomas)->decline($rafael);
        $active = Loan::offer($item, $thomas)->markReceived($thomas);
        $this->persist($item, $refused, $active);
        $i = $item->getId();

        $this->assertDbRejects("INSERT INTO loan (id, item_id, lender_id, borrower_id, status, requested_at, accepted_at, received_at, created_at, updated_at) VALUES ('01900000-0000-7000-8000-0000000000b1', '$i', '{$rafael->getId()}', '{$thomas->getId()}', 'ACTIVE', now(), now(), now(), now(), now())", 'uniq_loan_active_item');
        $this->assertDbRejects("UPDATE loan SET borrower_id = lender_id WHERE id = '{$active->getId()}'", 'chk_loan_not_self');
        $this->assertDbRejects("UPDATE loan SET received_at = NULL WHERE id = '{$active->getId()}'", 'chk_loan_received_at');
        $this->assertDbRejects("UPDATE loan SET status = 'OVERDUE' WHERE id = '{$refused->getId()}'", 'chk_loan_status');
        $this->assertDbRejects("DELETE FROM item WHERE id = '$i'", 'foreign key');
    }

    public function testLoanJournalIsAppendOnlyExceptGhostReassignment(): void
    {
        $rafael = $this->profile('rafael');
        $thomas = $this->profile('thomas');
        $loan = Loan::request(new Item($rafael, 'Perceuse', $this->room($rafael)), $thomas);
        $this->persist($loan->getPossession(), $loan);
        $event = $loan->getEvents()->first()->getId();

        $this->assertDbRejects("UPDATE loan_event SET type = 'CANCELLED' WHERE id = '$event'", 'écriture seule');
        $this->assertDbRejects("UPDATE loan_event SET occurred_at = now() - interval '1 year' WHERE id = '$event'", 'écriture seule');
        $this->assertDbRejects("DELETE FROM loan_event WHERE id = '$event'", 'écriture seule');

        $this->conn->executeStatement("UPDATE loan_event SET actor_id = '".Profile::GHOST_ID."' WHERE id = '$event'");
        self::assertSame(Profile::GHOST_ID, $this->fetchOne("SELECT actor_id FROM loan_event WHERE id = '$event'"));
    }
}
