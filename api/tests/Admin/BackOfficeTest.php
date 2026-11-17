<?php

namespace App\Tests\Admin;

use App\Entity\Identity\Account;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Item;
use App\Entity\Inventory\Scan;
use App\Entity\Loan\Loan;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Enum\Identity\ProfileType;
use App\Enum\Inventory\ScanKind;
use App\Enum\Inventory\ScanStatus;
use Doctrine\ORM\EntityManagerInterface;
use OTPHP\TOTP;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Le back-office (Twig, /admin) : réservé aux comptes ROLE_ADMIN, connexion
 * par formulaire, tableau de bord calculé sur les vraies données. Chaque
 * test tourne dans une transaction annulée (dama/doctrine-test-bundle).
 */
final class BackOfficeTest extends WebTestCase
{
    private const PASSWORD = 'un-mot-de-passe-solide';

    /** Le secret TOTP des administrateurs des tests (base 32). */
    public const TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

    private KernelBrowser $client;
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        $this->client = self::createClient();
        $this->em = self::getContainer()->get(EntityManagerInterface::class);
    }

    private function profile(string $username, bool $admin = false): Profile
    {
        $account = new Account($username.'@exemple.fr');
        $account->setPassword(self::getContainer()->get(UserPasswordHasherInterface::class)->hashPassword($account, self::PASSWORD));
        if ($admin) {
            $account->setRoles([Account::ROLE_ADMIN])->setTotpSecret(BackOfficeTest::TOTP_SECRET);
        }
        $profile = new Profile($account, ProfileType::Adult, ucfirst($username), 'Test', new \DateTimeImmutable('1990-01-01'), $username);
        $this->em->persist($account);
        $this->em->persist($profile);
        $this->em->flush();

        return $profile;
    }

    private function logIn(string $email): void
    {
        $crawler = $this->client->request('GET', '/admin/connexion');
        $this->client->submit($crawler->selectButton('Se connecter')->form(['email' => $email, 'password' => self::PASSWORD]));
    }

    public function testAnonymousVisitorsAreSentToTheLoginPage(): void
    {
        $this->client->request('GET', '/admin');
        self::assertResponseRedirects('/admin/connexion');

        $this->client->request('GET', '/admin/connexion');
        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('h1', 'Back-office');
    }

    public function testOnlyAdministratorsGetIn(): void
    {
        $this->profile('mathis');
        $this->logIn('mathis@exemple.fr');
        self::assertResponseRedirects('/admin/connexion');
        $this->client->followRedirect();
        self::assertSelectorTextContains('[role=alert]', 'réservé aux administrateurs');

        $this->logIn('nobody@exemple.fr');
        $this->client->followRedirect();
        self::assertSelectorTextContains('[role=alert]', 'E-mail ou mot de passe incorrect.');

        $this->profile('camille', admin: true);
        $this->logIn('camille@exemple.fr');
        $this->client->followRedirect();
        self::assertResponseRedirects('/admin/2fa', null, 'le mot de passe ne suffit pas : le code d\'abord');
        $this->client->request('GET', '/admin/utilisateurs');
        self::assertResponseRedirects('/admin/2fa', null, 'rien d\'autre avant le code');

        $form = $this->client->request('GET', '/admin/2fa')->selectButton('Vérifier')->form();
        $this->client->submit($form, ['_auth_code' => '000000']);
        $this->client->followRedirect();
        self::assertSelectorTextContains('[role=alert]', 'Ce code ne correspond pas');

        $form = $this->client->getCrawler()->selectButton('Vérifier')->form();
        $this->client->submit($form, ['_auth_code' => TOTP::createFromSecret(self::TOTP_SECRET)->now()]);
        self::assertResponseRedirects('/admin/utilisateurs', null, 'la page demandée avant le code');
        $this->client->followRedirect();
        self::assertSelectorTextContains('h1', 'Utilisateurs');
        self::assertSelectorTextContains('nav', 'Camille');
    }

    public function testAFirstLoginSetsUpTwoFactor(): void
    {
        $account = $this->profile('camille', admin: true)->getAccount();
        $account->setTotpSecret(null);
        $this->em->flush();
        $this->logIn('camille@exemple.fr');
        self::assertResponseRedirects('/admin', null, 'pas encore de code à demander');
        $this->client->followRedirect();
        self::assertResponseRedirects('/admin/2fa/activer', null, 'activation obligatoire avant toute page');

        $crawler = $this->client->followRedirect();
        self::assertStringStartsWith('data:image/svg+xml', (string) $crawler->filter('img')->attr('src'), 'le QR code');
        $secret = str_replace(' ', '', $crawler->filter('code')->text());

        $this->client->submit($crawler->selectButton('Activer')->form(), ['code' => '000000']);
        self::assertResponseStatusCodeSame(422);
        self::assertSelectorTextContains('[role=alert]', 'Ce code ne correspond pas');

        $this->client->submit($this->client->getCrawler()->selectButton('Activer')->form(), ['code' => TOTP::createFromSecret($secret)->now()]);
        self::assertResponseRedirects('/admin');
        $this->em->clear();
        self::assertSame($secret, $this->em->find(Account::class, $account->getId())?->getTotpAuthenticationConfiguration()?->getSecret(), 'le secret n\'est enregistré qu\'après un code juste');
    }

    public function testAForgedLoginIsRefused(): void
    {
        $this->profile('camille', admin: true);
        $this->client->request('POST', '/admin/connexion', ['email' => 'camille@exemple.fr', 'password' => self::PASSWORD, '_csrf_token' => 'faux']);
        $this->client->followRedirect();
        self::assertSelectorTextContains('[role=alert]', 'La page a expiré');
    }

    public function testTheDashboardCountsRealData(): void
    {
        $admin = $this->profile('camille', admin: true);
        $alice = $this->profile('alice');
        $bruno = $this->profile('bruno');
        foreach ([ScanStatus::Success, ScanStatus::Success, ScanStatus::Success, ScanStatus::Failed] as $status) {
            $this->em->persist(new Scan($alice, ScanKind::Photo, $status));
        }
        $place = new Place($alice, 'Maison');
        $room = new Room($place, 'Garage');
        $perceuse = new Item($alice, 'Perceuse', $room);
        $tente = new Item($alice, 'Tente', $room);
        $late = Loan::offer($perceuse, $bruno, new \DateTimeImmutable('-3 days'))->markReceived($bruno);
        $onTime = Loan::offer($tente, $bruno, new \DateTimeImmutable('+3 days'))->markReceived($bruno);
        foreach ([$place, $room, $perceuse, $tente, $late, $onTime] as $entity) {
            $this->em->persist($entity);
        }
        $this->em->flush();

        $this->client->loginUser($admin->getAccount(), 'admin');
        $crawler = $this->client->request('GET', '/admin');
        self::assertResponseIsSuccessful();

        $kpi = static fn (string $label) => trim(preg_replace('/\s+/u', ' ', $crawler->filter(\sprintf('section[aria-label="%s"]', $label))->text()));
        self::assertStringContainsString('Scans réussis 75 % 1 échec cette semaine', $kpi('Scans réussis'), '3 réussis sur 4');
        self::assertStringContainsString('Prêts en cours 2 1 en retard', $kpi('Prêts en cours'));
        self::assertStringContainsString('+3 cette semaine', $kpi('Utilisateurs actifs'), 'les trois comptes du test viennent d\'être créés');
        self::assertStringContainsString('Prêt en retard', $crawler->filter('#priorites')->ancestors()->first()->text());
        self::assertStringContainsString('« Perceuse » · Alice → Bruno', $crawler->filter('#priorites')->ancestors()->first()->text());
    }
}
