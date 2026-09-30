<?php

namespace App\Tests\Integration;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Item;
use App\Entity\Loan\Loan;
use App\Entity\Relation\Friendship;
use App\Entity\Sale\Address;
use App\Entity\Sale\Listing;
use App\Entity\Sale\Order;
use App\Entity\Sale\OrderAddress;
use App\Entity\Sale\OrderEvent;
use App\Entity\Sale\Payment;
use App\Entity\Sale\Refund;
use App\Entity\Sharing\ListingComment;
use App\Enum\Inventory\Availability;
use App\Enum\Sale\AddressRole;
use App\Enum\Sale\DeliveryMethod as D;
use App\Enum\Sale\DisputeReason;
use App\Enum\Sale\DisputeStatus;
use App\Enum\Sale\ListingStatus as L;
use App\Enum\Sale\OrderEventType as E;
use App\Enum\Sale\OrderStatus as S;
use App\Enum\Sale\PaymentDirection;
use App\Enum\Sale\PaymentMethod as P;
use App\Enum\Sale\PaymentStatus;
use App\Enum\Sale\RefundStatus;

final class SaleTest extends DatabaseTestCase
{
    private Profile $seller;
    private Profile $buyer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seller = $this->profile('rafael');
        $this->buyer = $this->profile('thomas');
        $friendship = new Friendship($this->seller, $this->buyer);
        $this->persist($friendship->accept());
    }

    private function listedItem(string $name, string $price): Listing
    {
        $item = new Item($this->seller, $name, $this->room($this->seller));
        $listing = (new Listing($item, $price))->publish();
        $this->persist($item, $listing);

        return $listing;
    }

    private function expectLogic(callable $fn): void
    {
        try {
            $fn();
            self::fail('Opération interdite acceptée.');
        } catch (\LogicException) {
            $this->addToAssertionCount(1);
        }
    }

    /** @return list<E> */
    private function events(Order $order): array
    {
        return array_map(static fn (OrderEvent $e) => $e->getType(), $order->getEvents()->toArray());
    }

    public function testListingRules(): void
    {
        $room = $this->room($this->seller);
        $velo = (new Item($this->seller, 'Vélo', $room))->setDescription('Taille M');
        $listing = new Listing($velo, '150.00');
        self::assertSame($this->seller, $listing->getSeller());
        self::assertSame('Taille M', $listing->getDescription());
        $this->persist($velo, $listing->publish());
        $this->assertValid($listing);

        $lea = $this->child('lea', $this->seller);
        $this->assertInvalid(new Listing(new Item($lea, 'Console', $room), '50.00'), 'pas autorisé à vendre');

        $lampe = new Item($this->seller, 'Lampe', $room);
        $this->persist($lampe, Loan::offer($lampe, $this->buyer)->markReceived($this->buyer));
        $this->expectLogic(fn () => (new Listing($lampe, '10.00'))->publish());

        $comment = new ListingComment($this->buyer, $listing, 'Combien de km ?');
        $this->persist($comment, new ListingComment($this->seller, $listing, '2000.', $comment));
        self::assertSame('LISTING', $this->fetchOne("SELECT target_type FROM comment WHERE id = '{$comment->getId()}'"));
    }

    public function testOnlyFriendsBuy(): void
    {
        $listing = $this->listedItem('Vélo', '150.00');
        $this->assertInvalid(new Order($listing, $this->profile('marie'), P::Online, D::Shipping), 'Seuls les amis');
        $listing->release();
        $this->assertValid(new Order($listing, $this->buyer, P::Online, D::Shipping));
    }

    public function testOnlineShippedPath(): void
    {
        $listing = $this->listedItem('Vélo', '150.00');
        $order = new Order($listing, $this->buyer, P::Online, D::Shipping, '6.90');
        self::assertSame(S::PendingPayment, $order->getStatus());
        self::assertSame(L::Reserved, $listing->getStatus());
        self::assertSame('156.90', $order->getTotalAmount());
        self::assertStringStartsWith('PND-', $order->getReference());
        $this->expectLogic(fn () => $listing->setPrice('100.00'));

        $home = new Address($this->buyer, 'Domicile', '3 rue des Lilas', '75011', 'Paris');
        OrderAddress::copyOf($order, AddressRole::Shipping, $home, 'Thomas M');
        $this->persist($home, $order);

        $charge = new Payment($order, PaymentDirection::Charge, 'stripe', 'pi_1', '156.90');
        $order->recordPaymentAuthorized();
        $charge->updateFromProvider(PaymentStatus::Captured);
        $order->recordPaymentCaptured();
        $shipment = $order->ship($this->seller, 'Colissimo', '6A123');
        $order->recordDelivered();
        $order->confirmReceipt($this->buyer);
        $this->persist($charge);

        self::assertSame(S::Completed, $order->getStatus());
        self::assertSame(L::Sold, $listing->getStatus());
        self::assertSame(Availability::Sold, $listing->getPossession()->getAvailability());
        self::assertNotNull($shipment->getDeliveredAt());
        self::assertSame([E::Created, E::PaymentAuthorized, E::PaymentCaptured, E::Shipped, E::Delivered, E::Received, E::Completed], $this->events($order));

        $this->expectLogic(fn () => new Refund($charge, $this->buyer, '200.00', 'Trop'));
        $refund = (new Refund($charge, $this->buyer, '156.90', 'Non conforme'))->markProcessed(RefundStatus::Succeeded, 're_1');
        $this->persist($refund);
        self::assertSame(S::Refunded, $order->getStatus());

        $home->update('10 avenue Foch', null, '75016', 'Paris', 'FR');
        $this->em->flush();
        self::assertSame('3 rue des Lilas', $this->fetchOne("SELECT line1 FROM order_address WHERE order_id = '{$order->getId()}'"), 'l\'adresse figée ne bouge pas');
    }

    public function testCashHandoverPath(): void
    {
        $listing = $this->listedItem('Tente', '40.00');
        $this->expectLogic(fn () => new Order($listing, $this->buyer, P::Cash, D::Shipping));

        $order = new Order($listing, $this->buyer, P::Cash, D::Handover);
        self::assertSame(S::AwaitingHandover, $order->getStatus());
        $this->expectLogic(fn () => new Payment($order, PaymentDirection::Charge, 'stripe', 'pi_x', '40.00'));
        $this->expectLogic(fn () => $order->recordPaymentCaptured());

        $order->scheduleHandover($this->buyer, 'Samedi 10 h');
        $order->confirmHandoverBySeller($this->seller);
        self::assertSame(S::AwaitingHandover, $order->getStatus(), 'une confirmation ne suffit pas');
        $this->expectLogic(fn () => $order->cancel($this->buyer));
        $order->confirmHandoverByBuyer($this->buyer);
        $this->persist($order);

        self::assertSame(S::Completed, $order->getStatus());
        self::assertSame([E::Created, E::HandoverScheduled, E::HandoverConfirmedBySeller, E::HandoverConfirmedByBuyer, E::Completed], $this->events($order));

        $dispute = $order->openDispute($this->buyer, DisputeReason::NotAsDescribed, 'Il manque les sardines');
        $this->expectLogic(fn () => $order->openDispute($this->seller, DisputeReason::Other, 'Moi aussi'));
        $dispute->resolve($this->admin(), 'Le vendeur envoie les sardines.');
        $this->em->flush();
        self::assertSame(DisputeStatus::Resolved, $dispute->getStatus());
    }

    public function testCancelledListingCanBeBoughtAgain(): void
    {
        $listing = $this->listedItem('Lampe', '15.00');
        $first = new Order($listing, $this->buyer, P::Online, D::Handover);
        $this->persist($first);
        $first->cancel($this->buyer);
        $this->em->flush();
        self::assertSame(L::Published, $listing->getStatus());

        $second = new Order($listing, $this->buyer, P::Online, D::Handover);
        $this->persist($second);
        $second->recordPaymentCaptured();
        $second->confirmHandoverByBuyer($this->buyer);
        self::assertSame(S::Completed, $second->getStatus(), 'en ligne + main propre : « j\'ai l\'objet » suffit');
    }

    public function testDatabaseGuardsSales(): void
    {
        $listing = $this->listedItem('Tente', '40.00');
        $cash = new Order($listing, $this->buyer, P::Cash, D::Handover);
        $cash->scheduleHandover($this->seller, 'Gare');
        $this->persist($cash);
        $home = new Address($this->buyer, 'Domicile', '1 rue', '75001', 'Paris');
        $this->persist($home);
        $online = $this->listedItem('Vélo', '10.00');
        $shipped = new Order($online, $this->buyer, P::Online, D::Shipping);
        OrderAddress::copyOf($shipped, AddressRole::Shipping, $home, 'Thomas');
        $this->persist($shipped, new Payment($shipped, PaymentDirection::Charge, 'stripe', 'pi_1', '10.00'));
        $item = $listing->getPossession()->getId();
        $c = $cash->getId();

        $this->assertDbRejects("INSERT INTO listing (id, seller_id, item_id, price, currency, status, audience, published_at, created_at, updated_at) VALUES ('01900000-0000-7000-8000-0000000000c4', '{$this->seller->getId()}', '$item', 6, 'EUR', 'PUBLISHED', 'FRIENDS_ONLY', now(), now(), now())", 'uniq_listing_on_sale_item');
        $this->assertDbRejects("UPDATE \"order\" SET delivery_method = 'SHIPPING' WHERE id = '$c'", 'chk_order_cash_handover');
        $this->assertDbRejects("UPDATE \"order\" SET status = 'PAID' WHERE id = '$c'", 'chk_order_cash_statuses');
        $this->assertDbRejects("UPDATE \"order\" SET total_amount = 1 WHERE id = '$c'", 'chk_order_amounts');
        $this->assertDbRejects("INSERT INTO payment (id, order_id, direction, provider, external_id, amount, currency, status, created_at, updated_at) VALUES ('01900000-0000-7000-8000-0000000000c2', '{$shipped->getId()}', 'CHARGE', 'stripe', 'pi_1', 1, 'EUR', 'PENDING', now(), now())", 'uniq_payment_provider_external');
        $this->assertDbRejects("UPDATE order_address SET line1 = 'ailleurs'", 'écriture seule');
        $this->assertDbRejects("DELETE FROM order_event WHERE order_id = '$c'", 'écriture seule');
    }
}
