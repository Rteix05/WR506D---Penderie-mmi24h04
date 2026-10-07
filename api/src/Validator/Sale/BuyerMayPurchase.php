<?php

namespace App\Validator\Sale;

use Symfony\Component\Validator\Constraint;

/**
 * « Seuls les amis achètent » (décision client, à ne pas rediscuter) : une
 * commande exige une Friendship ACCEPTED entre l'acheteur et le vendeur.
 * Et un profil dont la permission PURCHASE est DENIED (un enfant, par
 * défaut) n'achète pas.
 *
 * Règles qui lisent d'autres tables : un validateur, pas un CHECK.
 */
#[\Attribute(\Attribute::TARGET_CLASS)]
final class BuyerMayPurchase extends Constraint
{
    public string $notFriends = 'Seuls les amis du vendeur peuvent acheter.';
    public string $denied = 'Ce profil n\'est pas autorisé à acheter.';

    public function getTargets(): string
    {
        return self::CLASS_CONSTRAINT;
    }
}
