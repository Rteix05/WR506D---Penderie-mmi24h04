<?php

namespace App\Security;

use App\Entity\Identity\Account;
use App\Entity\Identity\Profile;
use App\Repository\Identity\ProfileRepository;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;
use Symfony\Component\Uid\Uuid;

/**
 * Le profil qui agit dans la requête courante.
 *
 * Le jeton JWT identifie un COMPTE ; un compte ouvre plusieurs profils
 * (Rafael, Léa…). L'application désigne le profil actif par l'en-tête
 * X-Profile (son identifiant) ; sans en-tête, c'est le profil par défaut
 * du compte. Refusé si le profil n'appartient pas au compte du jeton, ou
 * s'il est suspendu par la modération.
 */
final class CurrentProfile
{
    public const HEADER = 'X-Profile';

    private ?Profile $resolved = null;

    public function __construct(
        private readonly Security $security,
        private readonly RequestStack $requests,
        private readonly ProfileRepository $profiles,
    ) {
    }

    public function get(): Profile
    {
        return $this->resolved ??= $this->resolve();
    }

    public function account(): Account
    {
        $account = $this->security->getUser();
        if (!$account instanceof Account) {
            throw new AccessDeniedException('Authentification requise.');
        }

        return $account;
    }

    private function resolve(): Profile
    {
        $account = $this->account();
        $header = $this->requests->getCurrentRequest()?->headers->get(self::HEADER);

        if (null !== $header && '' !== $header) {
            $profile = Uuid::isValid($header) ? $this->profiles->find($header) : null;
            if (null === $profile || !$profile->getAccount()->getId()->equals($account->getId())) {
                throw new AccessDeniedException('Ce profil n\'appartient pas à ce compte.');
            }
        } else {
            $profile = $this->profiles->findOneBy(['account' => $account, 'isDefault' => true])
                ?? $this->profiles->findOneBy(['account' => $account], ['createdAt' => 'ASC'])
                ?? throw new AccessDeniedException('Ce compte n\'a aucun profil.');
        }

        if (null !== $profile->getSuspendedAt()) {
            throw new AccessDeniedException('Ce profil est suspendu.');
        }

        return $profile;
    }
}
