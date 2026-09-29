<?php

namespace App\Enum\Notification;

/**
 * Ce que l'administrateur a fait.
 */
enum ModerationActionType: string
{
    /** Masquer un contenu (réversible). */
    case HideContent = 'HIDE_CONTENT';

    case DeleteContent = 'DELETE_CONTENT';

    /** Avertir un profil. */
    case Warn = 'WARN';

    /** Suspendre un profil, éventuellement jusqu'à une date. */
    case SuspendProfile = 'SUSPEND_PROFILE';

    /** Bannir un compte, éventuellement jusqu'à une date. */
    case BanAccount = 'BAN_ACCOUNT';

    /** Annuler une action précédente. */
    case Restore = 'RESTORE';

    /** Les seules actions qui peuvent être temporaires (expiresAt). */
    public function canExpire(): bool
    {
        return self::SuspendProfile === $this || self::BanAccount === $this;
    }
}
