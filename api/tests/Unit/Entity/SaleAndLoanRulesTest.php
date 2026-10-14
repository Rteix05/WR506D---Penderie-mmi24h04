<?php

namespace App\Tests\Unit\Entity;

use App\Entity\Identity\Account;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Item;
use App\Entity\Loan\Loan;
use App\Entity\Media\Media;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Sale\Address;
use App\Entity\Sale\Listing;
use App\Entity\Sale\ListingMedia;
use App\Entity\Sale\Order;
use App\Entity\Sale\OrderAddress;
use App\Entity\Sale\Payment;
use App\Entity\Sale\Refund;
use App\Enum\Inventory\Availability;
use App\Enum\Sale\AddressRole;
use App\Enum\Sale\DeliveryMethod as D;
use App\Enum\Sale\DisputeReason;
use App\Enum\Sale\DisputeStatus;
use App\Enum\Sale\OrderStatus;
use App\Enum\Sale\PaymentDirection;
use App\Enum\Sale\PaymentMethod as P;
use App\Enum\Sale\PaymentStatus;
use App\Enum\Sale\RefundStatus;
use PHPUnit\Framework\TestCase;

/**
 * Les règles des ventes et des prêts portées par les entités elles-mêmes,
 * sans base de données : qui fait quel geste, dans quel ordre, et ce qui
 * est refusé. Les parcours complets, persistés, sont dans
 * tests/Integration/SaleTest.php et LoanTest.php.
 */
final class SaleAndLoanRulesTest extends TestCase
{
    use EntityTestKit;

    private Profile $seller;
    private Profile $buyer;
    private Room $room;

    protected function setUp(): void
    {
        $this->seller = self::adult('rafael');
        $this->buyer = self::adult('thomas');
        $this->room = new Room(new Place($this->seller, 'Maison'), 'Garage');
    }

    private function listing(): Listing
    {
        return (new Listing(new Item($this->seller, 'Vélo', $this->room), '150.00'))->publish();
    }

    /** Une commande en ligne payée, prête à partir. */
    private function paidOrder(D $delivery): Order
    {
        $order = new Order($this->listing(), $this->buyer, P::Online, $delivery, D::Shipping === $delivery ? '6.90' : '0.00');
        $order->recordPaymentCaptured();

        return $order;
    }

    public function testAnOrderIsCoherentFromTheStart(): void
    {
        self::assertRefused('Pas de frais de livraison pour une remise en main propre.', fn () => new Order($this->listing(), $this->buyer, P::Online, D::Handover, '4.00'));
        self::assertRefused('On n\'achète pas sa propre annonce.', fn () => new Order($this->listing(), $this->seller, P::Online, D::Shipping));
    }

    public function testEachGestureBelongsToOneParty(): void
    {
        $shipped = $this->paidOrder(D::Shipping);
        $handover = new Order($this->listing(), $this->buyer, P::Cash, D::Handover);
        $outsider = self::adult('julie');

        self::assertRefused('Seul le vendeur peut faire ce geste.', fn () => $shipped->ship($this->buyer, 'Colissimo', null));
        self::assertRefused('Seul l\'acheteur peut faire ce geste.', fn () => $shipped->confirmReceipt($this->seller));
        self::assertRefused('Ce profil ne fait pas partie de cette commande.', fn () => $handover->scheduleHandover($outsider, 'Samedi'));
        self::assertRefused('Cette commande est expédiée.', fn () => $shipped->scheduleHandover($this->seller, 'Samedi'));
        self::assertRefused('Cette commande se remet en main propre.', fn () => $this->paidOrder(D::Handover)->ship($this->seller, 'Colissimo', null));
        self::assertRefused('Transition impossible depuis le statut AWAITING_HANDOVER.', fn () => $handover->recordDelivered());
    }

    public function testEachSideConfirmsAHandoverOnce(): void
    {
        $order = new Order($this->listing(), $this->buyer, P::Cash, D::Handover);
        $order->confirmHandoverBySeller($this->seller);
        self::assertRefused('Le vendeur a déjà confirmé.', fn () => $order->confirmHandoverBySeller($this->seller));

        $online = $this->paidOrder(D::Handover);
        $online->confirmHandoverBySeller($this->seller);
        self::assertRefused('Le vendeur a déjà confirmé.', fn () => $online->confirmHandoverBySeller($this->seller));
        $online->confirmHandoverByBuyer($this->buyer);
        self::assertSame(OrderStatus::Completed, $online->getStatus(), 'en ligne, la confirmation de l\'acheteur suffit');
        self::assertRefused('Transition impossible depuis le statut COMPLETED.', fn () => $online->confirmHandoverByBuyer($this->buyer));
    }

    public function testTheBuyerCannotConfirmTwiceWhileWaitingForTheSeller(): void
    {
        $order = new Order($this->listing(), $this->buyer, P::Cash, D::Handover);
        $order->confirmHandoverByBuyer($this->buyer);
        self::assertSame(OrderStatus::AwaitingHandover, $order->getStatus(), 'en espèces, il faut les deux');
        self::assertRefused('L\'acheteur a déjà confirmé.', fn () => $order->confirmHandoverByBuyer($this->buyer));
    }

    public function testDisputesAndAddresses(): void
    {
        $cancelled = new Order($this->listing(), $this->buyer, P::Online, D::Shipping);
        $cancelled->cancel($this->buyer);
        self::assertRefused('Une commande annulée ne fait pas l\'objet d\'un litige.', fn () => $cancelled->openDispute($this->buyer, DisputeReason::Other, 'Rien reçu'));

        $order = $this->paidOrder(D::Shipping);
        $home = new Address($this->buyer, 'Maison', '1 rue des Lilas', '69001', 'Lyon');
        OrderAddress::copyOf($order, AddressRole::Shipping, $home, 'Thomas Test');
        self::assertRefused('Cette adresse est déjà figée pour la commande.', fn () => OrderAddress::copyOf($order, AddressRole::Shipping, $home, 'Thomas Test'));

        // Un litige se traite par un administrateur, et lui seul.
        $dispute = $order->openDispute($this->buyer, DisputeReason::NotReceived, 'Colis perdu');
        $admin = (new Account('admin@exemple.fr'))->setRoles([Account::ROLE_ADMIN]);
        self::assertRefused('Seul un administrateur traite un litige.', fn () => $dispute->takeInCharge($this->buyer->getAccount()));
        self::assertRefused('Seul un administrateur traite un litige.', fn () => $dispute->resolve($this->buyer->getAccount(), 'Remboursé'));
        self::assertSame(DisputeStatus::UnderReview, $dispute->takeInCharge($admin)->getStatus());
        self::assertSame(DisputeStatus::Closed, $dispute->resolve($admin, 'Sans suite', closeOnly: true)->getStatus());
    }

    public function testRefundsOnlyACapturedChargeWithinItsAmount(): void
    {
        $order = $this->paidOrder(D::Shipping);
        $charge = new Payment($order, PaymentDirection::Charge, 'stripe', 'pi_1', '156.90');
        self::assertRefused('On ne rembourse qu\'un encaissement capturé.', fn () => new Refund($charge, $this->buyer, '10.00', 'Abîmé'));

        $charge->updateFromProvider(PaymentStatus::Captured);
        self::assertRefused('Le montant remboursé doit être positif et ne pas dépasser le paiement.', fn () => new Refund($charge, $this->buyer, '200.00', 'Abîmé'));

        $refund = new Refund($charge, $this->buyer, '156.90', 'Abîmé');
        self::assertRefused('Statut de traitement inattendu.', fn () => $refund->markProcessed(RefundStatus::Requested));
        $refund->markProcessed(RefundStatus::Succeeded, 're_1');
        self::assertSame(OrderStatus::Refunded, $order->getStatus());
    }

    public function testAListingPhotoIsAttachedOnce(): void
    {
        $listing = $this->listing();
        $link = new ListingMedia($listing, new Media($this->seller, '2026/10/velo.jpg', 'image/jpeg', 10));
        $listing->attachMedia($link);

        self::assertCount(1, $listing->getGallery());
    }

    public function testLoanRules(): void
    {
        $velo = new Item($this->seller, 'Vélo', $this->room);
        self::assertRefused('On ne se prête pas un objet à soi-même.', fn () => Loan::offer($velo, $this->seller));
        self::assertRefused('Le profil fantôme n\'emprunte rien.', fn () => Loan::request($velo, self::ghost()));

        $jete = (new Item($this->seller, 'Vieux vélo', $this->room))->softDelete();
        self::assertRefused('Cet objet a été supprimé.', fn () => Loan::offer($jete, $this->buyer));

        $requested = Loan::request($velo, $this->buyer);
        self::assertRefused('Transition impossible depuis le statut REQUESTED.', fn () => $requested->markReceived($this->buyer));
        self::assertRefused('Ce profil ne fait pas partie de ce prêt.', fn () => $requested->cancel(self::adult('julie')));

        // Accepté, puis l'objet part ailleurs avant d'être remis : il ne se remet plus.
        $offered = Loan::offer($velo, $this->buyer);
        $velo->setAvailability(Availability::Sold);
        self::assertRefused('L\'objet n\'est plus disponible.', fn () => $offered->markReceived($this->buyer));
    }
}
