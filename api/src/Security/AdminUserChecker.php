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
 * connecté puis bloqué par une page 403. Le profil fantôme ne se connecte
 * jamais.
 */
final class AdminUserChecker implements UserCheckerInterface
{
    public function checkPreAuth(UserInterface $user, ?TokenInterface $token = null): void
    {
        if (!$user instanceof Account || $user->isGhost() || !$user->isAdmin()) {
            throw new CustomUserMessageAccountStatusException('Cet espace est réservé aux administrateurs de Penderie.');
        }
    }

    public function checkPostAuth(UserInterface $user, ?TokenInterface $token = null): void
    {
    }
}
