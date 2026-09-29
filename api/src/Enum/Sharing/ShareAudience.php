<?php

namespace App\Enum\Sharing;

/**
 * À qui s'adresse un partage (ou une publication).
 */
enum ShareAudience: string
{
    /** Des profils nommés (ShareRecipient). */
    case Specific = 'SPECIFIC';

    /** Tous les amis acceptés. */
    case Friends = 'FRIENDS';

    /** Les abonnés : lecture seule, jamais les commentaires. */
    case Followers = 'FOLLOWERS';

    /** Toute personne qui a le lien, sans compte : lecture seule. */
    case Link = 'LINK';

    /** Seuls les amis, nommés ou non, peuvent voir ou écrire des commentaires. */
    public function allowsComments(): bool
    {
        return self::Specific === $this || self::Friends === $this;
    }
}
