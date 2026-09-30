<?php

namespace App\Tests\Integration;

use App\Entity\Identity\Account;
use App\Entity\Identity\Profile;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Reference\Color;
use App\Entity\Reference\GarmentCategory;
use App\Entity\Reference\ItemCategory;
use App\Entity\Reference\Style;
use App\Enum\Identity\ProfileType;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Base des tests d'intégration : vraie base PostgreSQL (penderie_test),
 * migrations et référentiels chargés une fois pour toutes.
 *
 * Chaque test tourne dans une transaction annulée à la fin
 * (dama/doctrine-test-bundle) : aucun test ne voit les données d'un autre.
 */
abstract class DatabaseTestCase extends KernelTestCase
{
    protected EntityManagerInterface $em;
    protected Connection $conn;
    protected ValidatorInterface $validator;

    private int $sequence = 0;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->em = self::getContainer()->get(EntityManagerInterface::class);
        $this->conn = $this->em->getConnection();
        $this->validator = self::getContainer()->get(ValidatorInterface::class);
    }

    // --- Fabriques ---------------------------------------------------------------------

    /** Un profil persisté, avec son compte (nouveau, sauf si $account est fourni). */
    protected function profile(
        string $username,
        ProfileType $type = ProfileType::Adult,
        ?Profile $guardian = null,
        ?Account $account = null,
        string $birth = '1995-01-01',
    ): Profile {
        $account ??= $guardian?->getAccount() ?? new Account($username.'@exemple.fr');
        $profile = new Profile($account, $type, ucfirst($username), 'Test', new \DateTimeImmutable($birth), $username, $guardian);
        $this->em->persist($account);
        $this->em->persist($profile);
        $this->em->flush();

        return $profile;
    }

    protected function child(string $username, Profile $guardian): Profile
    {
        return $this->profile($username, ProfileType::Child, $guardian, null, '2016-03-12');
    }

    protected function admin(): Account
    {
        $admin = (new Account('admin'.++$this->sequence.'@exemple.fr'))->setRoles([Account::ROLE_ADMIN]);
        $this->em->persist($admin);
        $this->em->flush();

        return $admin;
    }

    protected function ghost(): Profile
    {
        return $this->em->find(Profile::class, Profile::GHOST_ID);
    }

    /** Une pièce persistée, dans un logement du profil. */
    protected function room(Profile $owner, string $name = 'Garage'): Room
    {
        $place = new Place($owner, 'Maison '.++$this->sequence);
        $room = new Room($place, $name);
        $this->em->persist($place);
        $this->em->persist($room);
        $this->em->flush();

        return $room;
    }

    protected function garmentCategory(string $slug): GarmentCategory
    {
        return $this->em->getRepository(GarmentCategory::class)->findOneBy(['slug' => $slug, 'owner' => null])
            ?? self::fail("Catégorie de vêtement « $slug » absente : lancer app:reference-data:load sur la base de test.");
    }

    protected function itemCategory(string $slug): ItemCategory
    {
        return $this->em->getRepository(ItemCategory::class)->findOneBy(['slug' => $slug, 'owner' => null])
            ?? self::fail("Catégorie d'objet « $slug » absente : lancer app:reference-data:load sur la base de test.");
    }

    protected function color(string $name): Color
    {
        return $this->em->getRepository(Color::class)->findOneBy(['name' => $name]) ?? self::fail("Couleur « $name » absente.");
    }

    protected function style(string $slug): Style
    {
        return $this->em->getRepository(Style::class)->findOneBy(['slug' => $slug]) ?? self::fail("Style « $slug » absent.");
    }

    protected function persist(object ...$entities): void
    {
        foreach ($entities as $entity) {
            $this->em->persist($entity);
        }
        $this->em->flush();
    }

    // --- Assertions --------------------------------------------------------------------

    /** Aucune violation de validation. */
    protected function assertValid(object $entity): void
    {
        $violations = $this->validator->validate($entity);
        self::assertCount(0, $violations, (string) $violations);
    }

    /** Au moins une violation dont le message contient $needle. */
    protected function assertInvalid(object $entity, string $needle): void
    {
        $violations = (string) $this->validator->validate($entity);
        self::assertStringContainsString($needle, $violations, "Violation attendue : « $needle ».");
    }

    /**
     * PostgreSQL refuse la requête, au nom de la contrainte ou du message
     * attendu. Joué dans un savepoint : la transaction du test survit.
     */
    protected function assertDbRejects(string $sql, string $expected): void
    {
        $this->conn->beginTransaction();
        try {
            $this->conn->executeStatement($sql);
            self::fail("La base a accepté : $sql");
        } catch (\Doctrine\DBAL\Exception $e) {
            self::assertStringContainsString($expected, $e->getMessage());
        } finally {
            $this->conn->rollBack();
        }
    }

    protected function fetchOne(string $sql): mixed
    {
        return $this->conn->fetchOne($sql);
    }
}
