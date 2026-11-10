<?php

namespace App\Tests\Admin;

use App\Entity\Identity\Account;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Item;
use App\Entity\Notification\ModerationAction;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Sale\Dispute;
use App\Entity\Sale\Listing;
use App\Entity\Sale\Order;
use App\Entity\Sale\Payment;
use App\Enum\Identity\ProfileType;
use App\Enum\Notification\ModerationActionType;
use App\Enum\Sale\DeliveryMethod;
use App\Enum\Sale\DisputeReason;
use App\Enum\Sale\DisputeStatus;
use App\Enum\Sale\PaymentDirection;
use App\Enum\Sale\PaymentMethod;
use App\Enum\Sale\PaymentStatus;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\DomCrawler\Crawler;

/**
 * Les écrans du back-office : utilisateurs (liste, fiche, suspension),
 * ventes, litiges (prise en charge, décision), catégories. Transaction
 * annulée à la fin de chaque test (dama/doctrine-test-bundle).
 */
final class ScreensTest extends WebTestCase
{
    private KernelBrowser $client;
    private EntityManagerInterface $em;
    private Account $admin;

    protected function setUp(): void
    {
        $this->client = self::createClient();
        $this->em = self::getContainer()->get(EntityManagerInterface::class);
        $this->admin = $this->profile('camille', admin: true)->getAccount();
        $this->client->loginUser($this->admin, 'admin');
    }

    private function profile(string $username, bool $admin = false, ?Account $account = null, ProfileType $type = ProfileType::Adult, ?Profile $guardian = null): Profile
    {
        $account ??= new Account($username.'@exemple.fr');
        if ($admin) {
            $account->setRoles([Account::ROLE_ADMIN])->setTotpSecret(BackOfficeTest::TOTP_SECRET);
        }
        $profile = new Profile($account, $type, ucfirst($username), 'Test', new \DateTimeImmutable(ProfileType::Child === $type ? '2016-01-01' : '1990-01-01'), $username, $guardian);
        $this->em->persist($account);
        $this->em->persist($profile);
        $this->em->flush();

        return $profile;
    }

    /** Une vente payée en ligne, et le litige ouvert par l'acheteur. */
    private function disputedSale(Profile $seller, Profile $buyer): Dispute
    {
        $place = new Place($seller, 'Maison');
        $room = new Room($place, 'Chambre');
        $echarpe = new Item($seller, 'Écharpe', $room);
        $listing = (new Listing($echarpe, '45.00'))->publish();
        $order = new Order($listing, $buyer, PaymentMethod::Online, DeliveryMethod::Handover);
        $charge = new Payment($order, PaymentDirection::Charge, 'stripe', 'pi_test', '45.00');
        $order->recordPaymentAuthorized();
        $charge->updateFromProvider(PaymentStatus::Captured);
        $order->recordPaymentCaptured();
        $dispute = $order->openDispute($buyer, DisputeReason::NotAsDescribed, 'C’est de l’acrylique');
        foreach ([$place, $room, $echarpe, $listing, $order, $charge, $dispute] as $entity) {
            $this->em->persist($entity);
        }
        $this->em->flush();

        return $dispute;
    }

    private function page(string $url): Crawler
    {
        // Le client partage l'EntityManager du test : un compte créé ici ne
        // connaît pas encore ses profils (côté inverse). On relit tout.
        $this->em->clear();
        $crawler = $this->client->request('GET', $url);
        self::assertResponseIsSuccessful($url);

        return $crawler;
    }

    public function testTheUserListSearchesAndFilters(): void
    {
        $mathis = $this->profile('mathis');
        $this->profile('noe', account: $mathis->getAccount(), type: ProfileType::Child, guardian: $mathis);
        $this->profile('julie');

        $rows = fn (string $url) => $this->page($url)->filter('section[aria-label=Comptes] tbody tr')->each(static fn (Crawler $tr) => $tr->filter('td')->first()->filter('p')->first()->text());
        self::assertEqualsCanonicalizing(['Camille', 'Mathis', 'Julie'], array_values(array_intersect($rows('/admin/utilisateurs'), ['Camille', 'Mathis', 'Julie'])));
        self::assertSame(['Mathis'], $rows('/admin/utilisateurs?q=noe'), 'la recherche trouve un compte par un de ses profils');
        self::assertSame(['Mathis'], $rows('/admin/utilisateurs?filter=children'));
        self::assertStringContainsString('2 · dont 1 enfant', $this->client->getCrawler()->filter('tbody tr')->text());
        self::assertSame([], $rows('/admin/utilisateurs?filter=suspended'));
    }

    public function testSuspendingAnAccountAndBringingItBack(): void
    {
        $mathis = $this->profile('mathis');
        $leo = $this->profile('leo', account: $mathis->getAccount(), type: ProfileType::Child, guardian: $mathis);
        $url = '/admin/utilisateurs/'.$mathis->getAccount()->getId();

        $crawler = $this->page($url);
        self::assertStringContainsString('@mathis · mathis@exemple.fr', $crawler->filter('section[aria-label=Compte]')->text(), 'le profil du compte, pas celui de l\'administrateur connecté');
        $form = $crawler->filter('form[action$="/suspendre"]')->form();
        $form['reason'] = '';
        $this->client->submit($form);
        $this->client->followRedirect();
        self::assertSelectorTextContains('[role=alert]', 'Le motif est obligatoire');

        $form['reason'] = 'Spam répété';
        $this->client->submit($form);
        $this->client->followRedirect();
        self::assertSelectorTextContains('[role=status]', 'Compte suspendu');
        $this->em->clear();
        foreach ([$mathis, $leo] as $p) {
            self::assertNotNull($this->em->find(Profile::class, $p->getId())->getSuspendedAt(), $p->getDisplayName().' est suspendu avec le compte');
        }
        self::assertSelectorTextContains('#journal + ol', 'Compte suspendu');
        self::assertSelectorTextContains('#journal + ol', '« Spam répété »');
        $until = $this->em->getRepository(ModerationAction::class)->findOneBy(['targetId' => $mathis->getAccount()->getId()])?->getExpiresAt();
        self::assertSame((new \DateTimeImmutable('+30 days'))->format('Y-m-d'), $until?->format('Y-m-d'), '30 jours par défaut, comme la maquette');
        self::assertSame(['Mathis'], $this->page('/admin/utilisateurs?filter=suspended')->filter('tbody tr td:first-child p:first-child')->each(static fn (Crawler $n) => $n->text()));

        $form = $this->page($url)->filter('form[action$="/reactiver"]')->form(['reason' => 'Erreur de ma part']);
        $this->client->submit($form);
        $this->client->followRedirect();
        $this->em->clear();
        self::assertNull($this->em->find(Profile::class, $mathis->getId())->getSuspendedAt());
        $types = array_map(static fn (ModerationAction $a) => $a->getActionType(), $this->em->getRepository(ModerationAction::class)->findBy(['targetId' => $mathis->getAccount()->getId()], ['createdAt' => 'ASC']));
        self::assertSame([ModerationActionType::BanAccount, ModerationActionType::Restore], $types, 'le journal garde les deux gestes');
    }

    public function testNoForgedOrSelfSuspension(): void
    {
        $mathis = $this->profile('mathis');
        $this->client->request('POST', '/admin/utilisateurs/'.$mathis->getAccount()->getId().'/suspendre', ['reason' => 'x', '_token' => 'faux']);
        $this->client->followRedirect();
        self::assertSelectorTextContains('[role=alert]', 'La page a expiré');
        self::assertNull($mathis->getSuspendedAt());

        $this->page('/admin/utilisateurs/'.$this->admin->getId());
        self::assertSelectorTextContains('#actions + p', 'C’est ton propre compte');
        self::assertSelectorNotExists('form[action$="/suspendre"]');
    }

    public function testSalesAndTheDisputeDecision(): void
    {
        $dispute = $this->disputedSale($this->profile('sarah'), $this->profile('mathis'));
        $reference = $dispute->getOrder()->getReference();

        self::assertStringContainsString('#'.$reference, $this->page('/admin/ventes?filter=disputed')->filter('tbody')->text());
        self::assertCount(0, $this->page('/admin/ventes?filter=refunded')->filter('tbody tr'));
        self::assertStringContainsString('Payé', $this->page('/admin/ventes?q='.$reference)->filter('tbody')->text());
        self::assertStringContainsString('Décision attendue', $this->page('/admin/litiges')->filter('tbody')->text());

        $url = '/admin/litiges/'.$dispute->getId();
        $crawler = $this->page($url);
        self::assertStringContainsString('Problème signalé par Mathis', $crawler->filter('#chronologie + ol')->text());
        self::assertStringContainsString('« C’est de l’acrylique »', $crawler->filter('#chronologie + ol')->text());

        $this->client->submit($crawler->selectButton('Prendre en charge')->form());
        $this->client->followRedirect();
        self::assertSame(DisputeStatus::UnderReview, $this->em->find(Dispute::class, $dispute->getId())->getStatus());

        $this->client->submit($this->client->getCrawler()->selectButton('Donner raison à l’acheteur')->form(['note' => 'L’étiquette dit acrylique.']));
        $this->client->followRedirect();
        $this->em->clear();
        $closed = $this->em->find(Dispute::class, $dispute->getId());
        self::assertSame(DisputeStatus::Resolved, $closed->getStatus());
        self::assertSame('En faveur de l\'acheteur : L’étiquette dit acrylique.', $closed->getResolution());
        self::assertSame($this->admin->getEmail(), $closed->getHandledBy()?->getEmail());
        self::assertSelectorNotExists('form[action$="/clore"]');
    }

    public function testCategoriesAreReadOnly(): void
    {
        $crawler = $this->page('/admin/categories');
        self::assertGreaterThan(0, $crawler->filter('section[aria-label=Objets] li')->count(), 'les référentiels de la base de test');
        self::assertCount(0, $crawler->filter('form'));
    }

    public function testEveryScreenIsForAdminsOnly(): void
    {
        $this->client->request('GET', '/admin/deconnexion');
        self::assertResponseRedirects('/admin/connexion', null, 'on se déconnecte');
        foreach (['/admin/utilisateurs', '/admin/ventes', '/admin/litiges', '/admin/categories'] as $url) {
            $this->client->request('GET', $url);
            self::assertResponseRedirects('/admin/connexion', null, $url);
        }
    }
}
