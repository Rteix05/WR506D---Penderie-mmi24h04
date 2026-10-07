<?php

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Les routes écrites à la main (partages, liens, contributions) ne passent
 * pas par API Platform, donc pas par son exception_to_status : sans ceci,
 * une règle métier refusée (LogicException) tomberait en 500.
 *
 * Même table que pour API Platform : règle violée par l'appelant → 422,
 * requête mal formée (valeur d'énumération inconnue, JSON invalide) → 400.
 * Les exceptions HTTP (403, 404…) et tout le reste suivent leur cours.
 */
final class ControllerErrorSubscriber implements EventSubscriberInterface
{
    private const ROUTES = ['api_share_', 'api_link_', 'api_contribution_'];

    public static function getSubscribedEvents(): array
    {
        return [KernelEvents::EXCEPTION => ['onException', 10]];
    }

    public function onException(ExceptionEvent $event): void
    {
        if (!$this->handles($event->getRequest())) {
            return;
        }
        $e = $event->getThrowable();
        $status = match (true) {
            $e instanceof HttpExceptionInterface => null,
            $e instanceof \ValueError, $e instanceof \JsonException, $e instanceof \TypeError => 400,
            $e instanceof \LogicException => 422,
            default => null,
        };
        if (null === $status) {
            return;
        }
        $event->setResponse(new JsonResponse(
            ['title' => 400 === $status ? 'Requête invalide' : 'Règle non respectée', 'status' => $status, 'detail' => $e->getMessage()],
            $status,
            ['Content-Type' => 'application/problem+json'],
        ));
    }

    private function handles(Request $request): bool
    {
        $route = (string) $request->attributes->get('_route');
        foreach (self::ROUTES as $prefix) {
            if (str_starts_with($route, $prefix)) {
                return true;
            }
        }

        return false;
    }
}
