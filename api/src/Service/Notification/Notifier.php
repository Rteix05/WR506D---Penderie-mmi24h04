<?php

namespace App\Service\Notification;

use App\Entity\Identity\Profile;
use App\Entity\Notification\Notification;
use App\Enum\Notification\NotificationType;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Crée une notification dans l'app, sans jamais faire échouer le geste qui
 * la déclenche : pas de notification à soi-même ni au profil fantôme. La
 * notification est persistée ; c'est l'appelant qui enregistre (flush),
 * dans la même transaction que l'événement.
 *
 * Push et e-mail (Notification::pushSentAt, NotificationPreference,
 * DeviceToken) attendent un identifiant de projet Expo (EAS) : ce sont des
 * notifications dans l'app pour l'instant.
 */
final class Notifier
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    /** @param array<string, mixed> $data ce qu'il faut pour ouvrir le bon écran */
    public function notify(Profile $recipient, NotificationType $type, string $title, ?string $body = null, array $data = [], ?Profile $actor = null): ?Notification
    {
        if ($recipient->isGhost() || (null !== $actor && $actor->getId()->equals($recipient->getId()))) {
            return null;
        }
        $notification = new Notification($recipient, $type, mb_substr($title, 0, 150), null === $body ? null : mb_substr($body, 0, 500), $data, $actor);
        $this->em->persist($notification);

        return $notification;
    }
}
