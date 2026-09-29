<?php

namespace App\Security;

use App\Entity\Identity\Profile;
use App\Enum\Identity\Permission;
use App\Enum\Identity\PermissionMode;
use App\Repository\Identity\ProfilePermissionRepository;

/**
 * Le mode effectif d'une permission pour un profil : l'exception réglée par
 * le tuteur si elle existe, sinon la politique par défaut du type de profil.
 *
 * C'est le seul endroit qui combine les deux sources ; le futur
 * ProfileVoter s'appuiera dessus au lieu de tester isChild().
 */
final class PermissionResolver
{
    public function __construct(private readonly ProfilePermissionRepository $permissions)
    {
    }

    public function resolve(Profile $profile, Permission $permission): PermissionMode
    {
        $override = $this->permissions->findOneBy(['profile' => $profile, 'permission' => $permission]);

        return $override?->getMode() ?? $permission->defaultModeFor($profile->getType());
    }
}
