<?php

namespace App\Security\Voter;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\AbstractPossession;
use App\Entity\Place\Box;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Place\Storage;
use App\Security\CurrentProfile;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * Qui peut voir ou modifier un bien (objet, vêtement) ou un lieu : son
 * propriétaire, et le tuteur de ce propriétaire (contrôle parental). Le
 * contenu de Léa n'appartient pas à Rafael — seul owner fait foi (MDD) —
 * mais Rafael, son tuteur, peut le gérer.
 *
 * L'accès des AUTRES profils (amis, abonnés) passe par un Share actif :
 * il viendra avec l'exposition du partage, dans ResourceAccessVoter.
 *
 * @extends Voter<string, object>
 */
final class OwnershipVoter extends Voter
{
    public const VIEW = 'VIEW';
    public const EDIT = 'EDIT';

    public function __construct(private readonly CurrentProfile $current)
    {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return \in_array($attribute, [self::VIEW, self::EDIT], true) && null !== self::ownerOf($subject);
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        $owner = self::ownerOf($subject);
        $me = $this->current->get();

        return $owner->getId()->equals($me->getId())
            || (null !== $owner->getGuardian() && $owner->getGuardian()->getId()->equals($me->getId()));
    }

    public static function ownerOf(mixed $subject): ?Profile
    {
        return match (true) {
            $subject instanceof AbstractPossession, $subject instanceof Place => $subject->getOwner(),
            $subject instanceof Room => $subject->getPlace()->getOwner(),
            $subject instanceof Storage => $subject->getRoom()->getPlace()->getOwner(),
            $subject instanceof Box => $subject->getRoom()->getPlace()->getOwner(),
            default => null,
        };
    }
}
