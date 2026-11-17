<?php

namespace App\EventSubscriber;

use App\Entity\Identity\Account;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

/**
 * « Double authentification obligatoire » (maquette « Admin — Connexion ») :
 * un administrateur qui ne l'a pas encore activée est renvoyé vers l'écran
 * d'activation, quelle que soit la page du back-office demandée. Seules
 * l'activation elle-même et la déconnexion restent ouvertes.
 *
 * Après le pare-feu (priorité 7 < 8) : l'utilisateur est connu.
 */
final class AdminTwoFactorEnrollmentSubscriber implements EventSubscriberInterface
{
    private const OPEN_ROUTES = ['admin_2fa_setup', 'admin_logout', 'admin_login', '2fa_login', '2fa_login_check'];

    public function __construct(
        private readonly Security $security,
        private readonly UrlGeneratorInterface $urls,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [KernelEvents::REQUEST => ['onRequest', 7]];
    }

    public function onRequest(RequestEvent $event): void
    {
        $request = $event->getRequest();
        $route = (string) $request->attributes->get('_route');
        if (!$event->isMainRequest() || !str_starts_with($request->getPathInfo(), '/admin') || \in_array($route, self::OPEN_ROUTES, true)) {
            return;
        }
        $account = $this->security->getUser();
        if ($account instanceof Account && $account->isAdmin() && !$account->isTotpAuthenticationEnabled()) {
            $event->setResponse(new RedirectResponse($this->urls->generate('admin_2fa_setup')));
        }
    }
}
