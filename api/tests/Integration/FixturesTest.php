<?php

namespace App\Tests\Integration;

use App\DataFixtures\DemoAccounts;
use App\Entity\Dressing\DailyLook;
use App\Entity\Identity\Account;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Place\Place;
use App\Entity\Relation\Follow;
use App\Entity\Relation\Friendship;
use App\Entity\Sharing\Post;
use Doctrine\Common\DataFixtures\Executor\ORMExecutor;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Le jeu de démonstration (src/DataFixtures) reste cohérent avec les règles
 * métier : chargé dans la base de test (transaction annulée à la fin),
 * chaque entité passe la validation, et les scénarios de bout en bout
 * (app/cypress) trouvent ce qu'ils attendent.
 *
 * Sans ce test, une règle ajoutée plus tard (un champ requis, une
 * contrainte) casserait la démonstration sans que la CI ne le voie.
 */
final class FixturesTest extends DatabaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $loader = self::getContainer()->get('doctrine.fixtures.loader');
        // Sans purge : la base de test garde ses référentiels, la transaction
        // du test (dama/doctrine-test-bundle) efface tout à la fin.
        (new ORMExecutor($this->em))->execute($loader->getFixtures(), true);
        $this->em->clear();
    }

    public function testEveryLoadedEntityIsValid(): void
    {
        // Le compte et le profil fantômes viennent de la migration, pas des
        // fixtures (né le 01/01/1900 exprès : jamais un vrai profil).
        $ghosts = [Account::GHOST_ID, Profile::GHOST_ID];
        foreach ([Account::class, Profile::class, Place::class, Garment::class, Item::class] as $class) {
            foreach ($this->em->getRepository($class)->findAll() as $entity) {
                if (\in_array((string) $entity->getId(), $ghosts, true)) {
                    continue;
                }
                $this->assertValid($entity);
            }
        }
    }

    public function testDemoAccountsLogInWithTheSharedPassword(): void
    {
        $hasher = self::getContainer()->get(UserPasswordHasherInterface::class);
        foreach ([DemoAccounts::CAMILLE, DemoAccounts::THOMAS, DemoAccounts::JULIE, DemoAccounts::NOUVEAU] as $email) {
            $account = $this->em->getRepository(Account::class)->findOneBy(['email' => $email]);
            self::assertNotNull($account, $email);
            self::assertTrue($hasher->isPasswordValid($account, DemoAccounts::PASSWORD), $email);
        }
    }

    public function testCamilleHasWhatTheEndToEndScenariosExpect(): void
    {
        $camille = $this->em->getRepository(Profile::class)->findOneBy(['username' => 'camille']);
        self::assertNotNull($camille);

        self::assertCount(9, $this->em->getRepository(Garment::class)->findBy(['owner' => $camille]));
        self::assertCount(3, $this->em->getRepository(Item::class)->findBy(['owner' => $camille]));
        self::assertCount(2, $this->em->getRepository(Place::class)->findBy(['owner' => $camille]));
        self::assertCount(1, $this->em->getRepository(Profile::class)->findBy(['guardian' => $camille]), 'Léo, son enfant');

        $friendship = $this->em->getRepository(Friendship::class)->findOneBy(['requester' => $camille]);
        self::assertTrue($friendship?->isAccepted());
        self::assertCount(1, $this->em->getRepository(Follow::class)->findBy(['follower' => $camille]));
    }

    public function testThomasLookIsPublishedForHisFriends(): void
    {
        $thomas = $this->em->getRepository(Profile::class)->findOneBy(['username' => 'thomas']);
        $look = $this->em->getRepository(DailyLook::class)->findOneBy(['owner' => $thomas]);

        self::assertNotNull($look);
        self::assertTrue($look->isPublished());
        self::assertCount(2, $look->getGarments());
        $post = $this->em->getRepository(Post::class)->findOneBy(['author' => $thomas]);
        self::assertSame('FRIENDS', $post?->getAudience()->value);
    }
}
