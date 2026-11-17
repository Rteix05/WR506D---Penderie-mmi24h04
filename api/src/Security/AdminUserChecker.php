<?php

namespace App\Security;

use App\Entity\Identity\Account;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAccountStatusException;
use Symfony\Component\Security\Core\User\UserCheckerInterface;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * La connexion au back-office (pare-feu admin) : un compte qui n'est pas
 * administrateur est refusé dès le formulaire, avec un message, plutôt que
 * connecté puis bloqué par une page 403. Les comptes techniques (profil
 * fantôme, modération IA) ne se connectent jamais.
 */
final class AdminUserChecker implements UserCheckerInterface
{
    public function checkPreAuth(UserInterface $user, ?TokenInterface $token = null): void
    {
        if (!$user instanceof Account || $user->isSystem() || !$user->isAdmin()) {
            // Une clé de traduction (domaine admin), affichée par la page de connexion.
            throw new CustomUserMessageAccountStatusException('login.error.notAdmin');
        }
    }

    public function checkPostAuth(UserInterface $user, ?TokenInterface $token = null): void
    {
    }
}
