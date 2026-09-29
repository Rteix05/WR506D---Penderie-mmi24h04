<?php

namespace App\Enum\Identity;

enum ApprovalStatus: string
{
    case Pending = 'PENDING';
    case Approved = 'APPROVED';
    case Rejected = 'REJECTED';
    case Expired = 'EXPIRED';

    /** Retirée par l'enfant avant la décision du tuteur. */
    case Withdrawn = 'WITHDRAWN';

    public function isFinal(): bool
    {
        return self::Pending !== $this;
    }
}
