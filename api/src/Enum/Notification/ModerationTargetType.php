<?php

namespace App\Enum\Notification;

/**
 * Ce sur quoi porte une action de modération : la liste de Report, plus
 * ACCOUNT pour un bannissement.
 */
enum ModerationTargetType: string
{
    case Account = 'ACCOUNT';

    case Profile = 'PROFILE';

    case Item = 'ITEM';

    case Garment = 'GARMENT';

    case Comment = 'COMMENT';

    case Listing = 'LISTING';

    case Collection = 'COLLECTION';

    case Post = 'POST';

    public function isContent(): bool
    {
        return self::Account !== $this && self::Profile !== $this;
    }
}
