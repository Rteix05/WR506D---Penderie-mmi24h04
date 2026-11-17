<?php

namespace App\EventSubscriber;

use App\Entity\Notification\Notification;
use App\Service\Notification\PushSender;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\Event\PostPersistEventArgs;
use Doctrine\ORM\Events;
use Symfony\Component\Console\ConsoleEvents;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Relie les notifications de l'app au push : chaque Notification
 * enregistrée (prêt, commentaire, ami, partage, modération, rappel…) est
 * aussi envoyée sur le téléphone, sans que les gestes qui la créent aient
 * à s'en occuper.
 *
 * L'envoi se fait APRÈS la réponse (kernel.terminate) — l'utilisateur
 * n'attend pas Expo — ou à la fin d'une commande (console.terminate, pour
 * les rappels de prêt).
 */
#[AsDoctrineListener(event: Events::postPersist)]
final class PushOnNotificationSubscriber implements EventSubscriberInterface
{
    /** @var list<Notification> */
    private array $pending = [];

    public function __construct(private readonly PushSender $sender)
    {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::TERMINATE => 'flush',
            ConsoleEvents::TERMINATE => 'flush',
        ];
    }

    public function postPersist(PostPersistEventArgs $args): void
    {
        $entity = $args->getObject();
        if ($entity instanceof Notification) {
            $this->pending[] = $entity;
        }
    }

    public function flush(): void
    {
        if ([] === $this->pending) {
            return;
        }
        $batch = $this->pending;
        $this->pending = [];
        $this->sender->send($batch);
    }
}
