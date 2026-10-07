<?php

namespace App\Security\Voter;

use App\Security\CurrentProfile;
use App\Security\ResourceAccess;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * VIEW et EDIT sur un bien, un lieu, un look ou une collection, décidés
 * par ResourceAccess (décisions du 30/09) :
 *  - VIEW : le propriétaire, son tuteur, ou quiconque à qui un partage
 *    actif s'applique (jamais pour un objet personnel) ;
 *  - EDIT (modifier directement, supprimer) : le propriétaire et son
 *    tuteur ; en colocation, tout membre sur une pièce commune et ses
 *    rangements (ResourceAccess::canManage). Un droit « Modifier » accordé
 *    par un partage, ou le foyer, ne permet que de PROPOSER, via une
 *    Contribution validée par le propriétaire.
 *
 * @extends Voter<string, object>
 */
final class OwnershipVoter extends Voter
{
    public const VIEW = 'VIEW';
    public const EDIT = 'EDIT';

    public function __construct(
        private readonly CurrentProfile $current,
        private readonly ResourceAccess $access,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return \in_array($attribute, [self::VIEW, self::EDIT], true) && \is_object($subject) && null !== ResourceAccess::ownerOf($subject);
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        $me = $this->current->get();

        return self::EDIT === $attribute
            ? $this->access->canManage($me, $subject)
            : $this->access->canRead($me, $subject);
    }
}
