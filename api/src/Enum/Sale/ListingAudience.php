<?php

namespace App\Enum\Sale;

/**
 * Qui voit l'annonce. Dans tous les cas, seuls les amis achètent (MDD).
 */
enum ListingAudience: string
{
    /** Par défaut. */
    case FriendsOnly = 'FRIENDS_ONLY';

    /** Les abonnés la voient aussi, sans pouvoir l'acheter. */
    case FriendsAndFollowers = 'FRIENDS_AND_FOLLOWERS';
}
