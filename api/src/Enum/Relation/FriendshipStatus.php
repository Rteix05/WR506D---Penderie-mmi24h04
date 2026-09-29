<?php

namespace App\Enum\Relation;

enum FriendshipStatus: string
{
    case Pending = 'PENDING';
    case Accepted = 'ACCEPTED';
    case Declined = 'DECLINED';
}
