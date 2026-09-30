<?php

namespace App\Controller;

use App\Entity\Identity\Profile;
use App\Security\CurrentProfile;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Qui suis-je : le compte du jeton, ses profils (pour le sélecteur de
 * profil de l'application) et le profil actif de la requête.
 */
final class MeController extends AbstractController
{
    #[Route('/api/me', name: 'api_me', methods: ['GET'])]
    public function __invoke(CurrentProfile $current): JsonResponse
    {
        $account = $current->account();
        $active = $current->get();

        return $this->json([
            'account' => [
                'id' => $account->getId(),
                'email' => $account->getEmail(),
                'roles' => $account->getRoles(),
            ],
            'activeProfile' => $active->getId(),
            'profiles' => array_map(static fn (Profile $p) => [
                'id' => $p->getId(),
                '@id' => '/api/profiles/'.$p->getId(),
                'username' => $p->getUsername(),
                'displayName' => $p->getDisplayName(),
                'type' => $p->getType(),
                'isDefault' => $p->isDefault(),
                'suspended' => null !== $p->getSuspendedAt(),
            ], $account->getProfiles()->toArray()),
        ]);
    }
}
