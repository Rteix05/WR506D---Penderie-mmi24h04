<?php

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * La langue du back-office (/admin) : français, anglais ou japonais.
 *
 * Celle choisie dans le menu (?lang=en, gardée en session), sinon celle du
 * navigateur si le back-office la parle, sinon le français. L'API n'est pas
 * concernée : elle garde sa langue par défaut.
 *
 * Priorité 20 : avant LocaleAwareListener (15), qui donne la langue de la
 * requête au traducteur.
 */
final class AdminLocaleSubscriber implements EventSubscriberInterface
{
    public const LOCALES = ['fr', 'en', 'ja'];
    private const SESSION_KEY = 'admin_locale';

    public static function getSubscribedEvents(): array
    {
        return [KernelEvents::REQUEST => ['onRequest', 20]];
    }

    public function onRequest(RequestEvent $event): void
    {
        $request = $event->getRequest();
        if (!$event->isMainRequest() || !str_starts_with($request->getPathInfo(), '/admin') || !$request->hasSession()) {
            return;
        }

        $session = $request->getSession();
        $asked = $request->query->getString('lang');
        if (\in_array($asked, self::LOCALES, true)) {
            $session->set(self::SESSION_KEY, $asked);
        }

        $saved = $session->get(self::SESSION_KEY);
        $request->setLocale(\is_string($saved) && \in_array($saved, self::LOCALES, true)
            ? $saved
            // Le premier de la liste (le français) quand le navigateur n'en demande aucune.
            : ($request->getPreferredLanguage(self::LOCALES) ?? 'fr'));
    }
}
