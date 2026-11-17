<?php

namespace App\Service\Notification;

use App\Entity\Notification\DeviceToken;
use App\Entity\Notification\Notification;
use App\Entity\Notification\NotificationPreference;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpException;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Envoie en push les notifications de l'app, par le service Expo Push
 * (https://exp.host/--/api/v2/push/send) : une notification dans l'app =
 * une notification sur le téléphone, avec le même titre, le même texte et
 * les mêmes données (l'app ouvre le même écran dans les deux cas).
 *
 * Une notification vise un PROFIL ; le push part vers les appareils de son
 * COMPTE (DeviceToken), avec le profil visé dans data (l'app bascule
 * dessus au toucher). Respecte le réglage push du type
 * (NotificationPreference, activé par défaut). Un appareil qu'Expo dit
 * désinscrit (DeviceNotRegistered) est oublié.
 *
 * Jamais bloquant : une panne d'Expo est journalisée, la notification
 * reste dans l'app.
 */
final class PushSender
{
    private const CHUNK = 100;

    public function __construct(
        private readonly HttpClientInterface $expoPushClient,
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface $logger,
    ) {
    }

    /** @param list<Notification> $notifications */
    public function send(array $notifications): void
    {
        $messages = [];
        $sent = [];
        foreach ($notifications as $notification) {
            if (null !== $notification->getPushSentAt() || !$this->pushEnabled($notification)) {
                continue;
            }
            $recipient = $notification->getRecipient();
            $tokens = $this->em->getRepository(DeviceToken::class)->findBy(['account' => $recipient->getAccount()]);
            foreach ($tokens as $token) {
                $messages[] = [
                    'to' => $token->getToken(),
                    'title' => $notification->getTitle(),
                    'body' => $notification->getBody() ?? '',
                    'sound' => 'default',
                    'data' => $notification->getData() + [
                        'notificationId' => (string) $notification->getId(),
                        'profileId' => (string) $recipient->getId(),
                        'type' => $notification->getType()->value,
                    ],
                ];
            }
            if ([] !== $tokens) {
                $sent[] = $notification;
            }
        }
        if ([] === $messages) {
            return;
        }

        foreach (array_chunk($messages, self::CHUNK) as $chunk) {
            try {
                $tickets = $this->expoPushClient->request('POST', 'push/send', ['json' => $chunk, 'timeout' => 5, 'max_duration' => 8])->toArray(false)['data'] ?? [];
            } catch (HttpException $e) {
                $this->logger->warning('Expo Push indisponible : {message}', ['message' => $e->getMessage()]);

                return;
            }
            foreach ((array) $tickets as $i => $ticket) {
                if ('DeviceNotRegistered' === ($ticket['details']['error'] ?? null)) {
                    $this->forget((string) $chunk[$i]['to']);
                }
            }
        }
        foreach ($sent as $notification) {
            $notification->markPushSent();
        }
        $this->em->flush();
    }

    private function pushEnabled(Notification $notification): bool
    {
        $pref = $this->em->getRepository(NotificationPreference::class)->findOneBy(['profile' => $notification->getRecipient(), 'type' => $notification->getType()]);

        return $pref?->isPushEnabled() ?? NotificationPreference::DEFAULT_PUSH;
    }

    private function forget(string $token): void
    {
        $device = $this->em->getRepository(DeviceToken::class)->findOneBy(['token' => $token]);
        if (null !== $device) {
            $this->em->remove($device);
        }
    }
}
