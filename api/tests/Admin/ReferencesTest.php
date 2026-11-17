<?php

namespace App\Tests\Admin;

use App\Entity\Identity\Account;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Reference\Brand;
use App\Entity\Reference\GarmentCategory;
use App\Enum\Identity\ProfileType;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Catégories et marques du back-office : tout administrateur consulte,
 * seul le super administrateur ajoute, valide, fusionne ou supprime.
 */
final class ReferencesTest extends WebTestCase
{
    private KernelBrowser $client;
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        $this->client = self::createClient();
        $this->em = self::getContainer()->get(EntityManagerInterface::class);
    }

    private function admin(bool $super): Account
    {
        $account = (new Account(($super ? 'super' : 'simple').'@exemple.fr'))
            ->setRoles($super ? [Account::ROLE_ADMIN, Account::ROLE_SUPER_ADMIN] : [Account::ROLE_ADMIN])
            ->setTotpSecret(BackOfficeTest::TOTP_SECRET);
        $this->em->persist($account);
        $this->em->flush();
        $this->client->loginUser($account, 'admin');

        return $account;
    }

    /**
     * Envoie le formulaire dont l'action est $url, avec son jeton CSRF lu
     * sur la page, comme un vrai clic.
     *
     * @param array<string, string> $fields
     */
    private function post(string $url, array $fields = []): void
    {
        $page = str_contains($url, '/marques/') ? '/admin/categories?tab=brands&filter=all&q=kitsune' : '/admin/categories';
        $form = $this->client->request('GET', $page)->filter(\sprintf('form[action="%s"]', $url));
        self::assertGreaterThan(0, $form->count(), 'formulaire '.$url);
        $this->client->request('POST', $url, ['_token' => (string) $form->first()->filter('input[name=_token]')->attr('value')] + $fields);
    }

    public function testASimpleAdminOnlyReads(): void
    {
        $this->admin(false);
        $crawler = $this->client->request('GET', '/admin/categories?tab=brands&filter=all', [], [], ['HTTP_ACCEPT_LANGUAGE' => 'fr']);
        self::assertResponseIsSuccessful();
        self::assertCount(0, $crawler->filter('form[method=post]'), 'aucun formulaire de modification');
        self::assertSelectorTextContains('main', 'Consultation seulement');

        $this->client->request('POST', '/admin/categories/marques/ajouter', ['name' => 'Patagonia']);
        self::assertResponseStatusCodeSame(403);
    }

    public function testTheSuperAdminManagesBrands(): void
    {
        $this->admin(true);
        $this->post('/admin/categories/marques/ajouter', ['name' => 'Maison Kitsuné']);
        $added = $this->em->getRepository(Brand::class)->findOneBy(['slug' => 'maisonkitsune']);
        self::assertNotNull($added);
        self::assertTrue($added->isVerified(), 'ajoutée par le super admin : vérifiée d’emblée');

        // Une marque proposée par un utilisateur, en doublon, portée par un vêtement.
        $owner = new Profile(new Account('lea@exemple.fr'), ProfileType::Adult, 'Léa', 'Test', new \DateTimeImmutable('1995-01-01'), 'lea');
        $room = new Room(new Place($owner, 'Maison'), 'Chambre');
        $proposed = Brand::proposedBy('Kitsune Maison', $owner);
        $garment = (new Garment($owner, 'Sweat renard', $room, $this->em->getRepository(GarmentCategory::class)->findOneBy(['slug' => 'sweats', 'owner' => null])))->setBrand($proposed);
        foreach ([$owner->getAccount(), $owner, $room->getPlace(), $room, $proposed, $garment] as $entity) {
            $this->em->persist($entity);
        }
        $this->em->flush();

        $crawler = $this->client->request('GET', '/admin/categories?tab=brands');
        self::assertStringContainsString('Kitsune Maison', $crawler->filter('tbody')->text(), 'à valider');

        $this->post('/admin/categories/marques/'.$proposed->getId().'/fusionner', ['into' => (string) $added->getId()]);
        $this->em->clear();
        self::assertNull($this->em->getRepository(Brand::class)->findOneBy(['slug' => 'kitsunemaison']), 'le doublon disparaît');
        self::assertSame('Maison Kitsuné', $this->em->find(Garment::class, $garment->getId())?->getBrand()?->getName(), 'le vêtement suit');

        $this->post('/admin/categories/marques/'.$added->getId().'/supprimer');
        self::assertNotNull($this->em->getRepository(Brand::class)->findOneBy(['slug' => 'maisonkitsune']), 'une marque portée ne se supprime pas');
    }

    public function testTheSuperAdminAddsACategory(): void
    {
        $this->admin(true);
        $parent = $this->em->getRepository(GarmentCategory::class)->findOneBy(['slug' => 'hauts', 'owner' => null]);
        $this->post('/admin/categories/ajouter', ['kind' => 'garment', 'name' => 'Polos', 'parent' => (string) $parent?->getId(), 'warmth' => 'LIGHT']);

        $polos = $this->em->getRepository(GarmentCategory::class)->findOneBy(['slug' => 'polos', 'owner' => null]);
        self::assertNotNull($polos);
        self::assertSame('hauts', $polos->getParent()?->getSlug());
        self::assertSame('LIGHT', $polos->getDefaultWarmth()?->value);

        $this->post('/admin/categories/garment/'.$polos->getId().'/supprimer');
        $this->em->clear();
        self::assertNull($this->em->getRepository(GarmentCategory::class)->findOneBy(['slug' => 'polos', 'owner' => null]), 'vide : supprimée');
    }
}
