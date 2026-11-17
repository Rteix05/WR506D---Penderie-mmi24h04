<?php

namespace App\Enum\Notification;

/**
 * Pourquoi un contenu est signalé (MDD, Report.reason).
 */
enum ReportReason: string
{
    case Spam = 'SPAM';

    case Inappropriate = 'INAPPROPRIATE';

    case Counterfeit = 'COUNTERFEIT';

    case Harassment = 'HARASSMENT';

    case Other = 'OTHER';
}
