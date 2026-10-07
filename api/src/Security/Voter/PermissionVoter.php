<?php

namespace App\Security\Voter;

use App\Enum\Identity\Permission;
use App\Enum\Identity\PermissionMode;
use App\Security\CurrentProfile;
use App\Security\PermissionResolver;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * is_granted('ITEM_CREATE'), is_granted('SELL')… : le profil actif a-t-il
 * cette permission ? Le seul endroit qui répond, via PermissionResolver
 * (politique par défaut du type de profil + exceptions du tuteur). Aucun
 * « if isChild() » ailleurs (MDD).
 *
 * REQUIRES_APPROVAL est refusé ici : l'action passe alors par une
 * ApprovalRequest, dont le parcours viendra avec son exposition.
 *
 * @extends Voter<string, mixed>
 */
final class PermissionVoter extends Voter
{
    public function __construct(
        private readonly CurrentProfile $current,
        private readonly PermissionResolver $permissions,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return null !== Permission::tryFrom($attribute);
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        $mode = $this->permissions->resolve($this->current->get(), Permission::from($attribute));
        $vote?->addReason(\sprintf('Permission %s : %s.', $attribute, $mode->value));

        return PermissionMode::Allowed === $mode;
    }
}
