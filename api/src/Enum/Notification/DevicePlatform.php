<?php

namespace App\Enum\Notification;

/**
 * La plateforme d'un appareil qui reçoit les notifications push.
 */
enum DevicePlatform: string
{
    case Ios = 'IOS';

    case Android = 'ANDROID';
}
