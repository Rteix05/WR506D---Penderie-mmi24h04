<?php

namespace App\Enum\Identity;

enum PermissionMode: string
{
    case Allowed = 'ALLOWED';
    case Denied = 'DENIED';

    /** L'action crée une ApprovalRequest adressée au tuteur. */
    case RequiresApproval = 'REQUIRES_APPROVAL';
}
