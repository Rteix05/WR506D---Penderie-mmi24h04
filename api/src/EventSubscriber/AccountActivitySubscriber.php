<?php

namespace App\EventSubscriber;

use App\Entity\Identity\Account;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Note le jour où un compte utilise l'app (Account::lastSeenAt), pour la
 * carte « Utilisateurs actifs » du back-office. Seulement l'API (le
 * back-office n'est pas un usage de l'app), après le pare-feu (priorité 7 <
 * 8), et une écriture par jour au plus : la comparaison est en mémoire,
 * l'UPDATE ne part que le premier appel de la journée.
 */
final class AccountActivitySubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly Security $security,
        private readonly EntityManagerInterface $em,
        private readonly ClockInterface $clock,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [KernelEvents::REQUEST => ['onRequest', 7]];
    }

    public function onRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest() || !str_starts_with($event->getRequest()->getPathInfo(), '/api')) {
            return;
        }
        $account = $this->security->getUser();
        if ($account instanceof Account && !$account->isGhost() && $account->markSeen($this->clock->now())) {
            // Une requête ciblée : pas de flush global au milieu de la requête.
            $this->em->createQueryBuilder()
                ->update(Account::class, 'a')->set('a.lastSeenAt', ':now')->where('a.id = :id')
                ->setParameter('now', $account->getLastSeenAt(), 'datetime_immutable')->setParameter('id', $account->getId(), 'uuid')
                ->getQuery()->execute();
        }
    }
}
