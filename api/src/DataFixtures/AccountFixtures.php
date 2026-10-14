<?php

namespace App\DataFixtures;

use App\Entity\Identity\Account;
use App\Entity\Identity\Profile;
use App\Enum\Identity\ProfileType;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Comptes et profils de démonstration.
 *
 * Même construction que l'inscription (RegisterController) : un compte, son
 * profil adulte par défaut, le mot de passe haché par le hasheur de Symfony.
 * Camille a en plus un profil enfant (Léo), dont elle est la tutrice.
 *
 * Références posées pour les fixtures suivantes : profile-camille,
 * profile-leo, profile-thomas, profile-julie, profile-nouveau.
 */
final class AccountFixtures extends Fixture
{
    public function __construct(private readonly UserPasswordHasherInterface $hasher)
    {
    }

    public function load(ObjectManager $manager): void
    {
        $camille = $this->adult($manager, DemoAccounts::CAMILLE, 'Camille', 'Martin', '1996-04-18', 'camille');
        $this->adult($manager, DemoAccounts::THOMAS, 'Thomas', 'Bernard', '1994-11-02', 'thomas');
        $this->adult($manager, DemoAccounts::JULIE, 'Julie', 'Petit', '1998-07-25', 'julie');
        $this->adult($manager, DemoAccounts::NOUVEAU, 'Nina', 'Nouvelle', '2000-01-10', 'nina');

        // Un enfant sur le même compte que sa tutrice (profil CHILD).
        $leo = new Profile($camille->getAccount(), ProfileType::Child, 'Léo', 'Martin', new \DateTimeImmutable('2016-09-03'), 'leo', $camille);
        $manager->persist($leo);
        $this->addReference('profile-leo', $leo);

        $manager->flush();
    }

    private function adult(ObjectManager $manager, string $email, string $firstName, string $lastName, string $birth, string $username): Profile
    {
        $account = new Account($email);
        $account->setPassword($this->hasher->hashPassword($account, DemoAccounts::PASSWORD));
        $profile = (new Profile($account, ProfileType::Adult, $firstName, $lastName, new \DateTimeImmutable($birth), $username))
            ->setIsDefault(true);

        $manager->persist($account);
        $manager->persist($profile);
        $this->addReference('profile-'.$username, $profile);

        return $profile;
    }
}
