<?php

namespace App\Controller\Dressing;

use App\Entity\Dressing\OutfitSuggestion;
use App\Entity\Inventory\Garment;
use App\Enum\Inventory\GarmentUsage;
use App\Security\CurrentProfile;
use App\Service\Outfit\OutfitSuggester;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Uid\Uuid;

/**
 * Les suggestions de tenues (écran « Ta tenue », maquette suggestion-v2) :
 *
 *  - GET  /api/outfit-suggestions/current : la suggestion du jour encore
 *    ouverte, ou null ;
 *  - POST /api/outfit-suggestions : {occasion: EVERYDAY|WORK|SPORT|EVENING,
 *    latitude?, longitude?, locale?} — une tenue (201) ; 422 si le dressing
 *    ne permet aucune tenue ;
 *  - POST /api/outfit-suggestions/{id}/next : « Nouvelle tenue », même
 *    occasion, d'autres pièces ; l'ancienne passe REPLACED ;
 *  - POST /api/outfit-suggestions/{id}/swap : {garment: id, dislike?:
 *    bool} — « Remplacer » une pièce, ou « Je n'aime pas » (elle est en plus
 *    écartée des prochaines suggestions) ;
 *  - POST /api/outfit-suggestions/{id}/accept : {name?} — « J'aime cette
 *    tenue » : elle devient une tenue du dressing.
 *
 * Toujours pour le profil actif, et seulement ses suggestions.
 */
#[Route('/api/outfit-suggestions')]
final class OutfitSuggestionController extends AbstractController
{
    public function __construct(
        private readonly OutfitSuggester $suggester,
        private readonly CurrentProfile $current,
        private readonly EntityManagerInterface $em,
    ) {
    }

    #[Route('/current', name: 'api_outfit_suggestion_current', methods: ['GET'])]
    public function current(): JsonResponse
    {
        $suggestion = $this->suggester->current($this->current->get());

        return $this->json(['suggestion' => null === $suggestion ? null : $this->suggester->describe($suggestion)]);
    }

    #[Route('', name: 'api_outfit_suggestion_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $body = $this->body($request);
        $occasion = GarmentUsage::tryFrom((string) ($body['occasion'] ?? 'EVERYDAY'))
            ?? throw new BadRequestHttpException('occasion : EVERYDAY, WORK, SPORT ou EVENING.');

        return $this->generate($request, $occasion, null);
    }

    #[Route('/{id}/next', name: 'api_outfit_suggestion_next', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function next(string $id, Request $request): JsonResponse
    {
        $previous = $this->suggestion($id, open: true);

        return $this->generate($request, $previous->getOccasion(), $previous);
    }

    #[Route('/{id}/swap', name: 'api_outfit_suggestion_swap', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function swap(string $id, Request $request): JsonResponse
    {
        $suggestion = $this->suggestion($id, open: true);
        $body = $this->body($request);
        $garmentId = (string) ($body['garment'] ?? '');
        $garment = Uuid::isValid($garmentId) ? $this->em->find(Garment::class, $garmentId) : null;
        if (null === $garment) {
            throw new BadRequestHttpException('garment : l\'identifiant d\'une pièce de la tenue.');
        }
        try {
            $this->suggester->swap($suggestion, $garment, (bool) ($body['dislike'] ?? false));
        } catch (\DomainException $e) {
            throw new UnprocessableEntityHttpException($e->getMessage(), $e);
        }

        return $this->json(['suggestion' => $this->suggester->describe($suggestion)]);
    }

    #[Route('/{id}/accept', name: 'api_outfit_suggestion_accept', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function accept(string $id, Request $request): JsonResponse
    {
        $suggestion = $this->suggestion($id, open: true);
        $outfit = $this->suggester->accept($suggestion, \is_string($this->body($request)['name'] ?? null) ? $this->body($request)['name'] : null);

        return $this->json(['outfit' => ['id' => (string) $outfit->getId(), 'name' => $outfit->getName()]], Response::HTTP_CREATED);
    }

    private function generate(Request $request, GarmentUsage $occasion, ?OutfitSuggestion $previous): JsonResponse
    {
        $body = $this->body($request);
        $coordinate = static fn (mixed $v): ?float => is_numeric($v) ? (float) $v : null;
        $locale = \in_array($body['locale'] ?? null, ['fr', 'en', 'ja'], true) ? $body['locale'] : ($request->getPreferredLanguage(['fr', 'en', 'ja']) ?? 'fr');

        try {
            $suggestion = $this->suggester->suggest($this->current->get(), $occasion, $coordinate($body['latitude'] ?? null), $coordinate($body['longitude'] ?? null), $locale, $previous);
        } catch (\DomainException $e) {
            throw new UnprocessableEntityHttpException($e->getMessage(), $e);
        }

        return $this->json(['suggestion' => $this->suggester->describe($suggestion)], Response::HTTP_CREATED);
    }

    private function suggestion(string $id, bool $open = false): OutfitSuggestion
    {
        $suggestion = $this->em->find(OutfitSuggestion::class, $id);
        if (null === $suggestion || !$suggestion->getProfile()->getId()->equals($this->current->get()->getId())) {
            throw new NotFoundHttpException('Suggestion introuvable.');
        }
        if ($open && 'PROPOSED' !== $suggestion->getStatus()->value) {
            throw new UnprocessableEntityHttpException('Cette suggestion est déjà close.');
        }

        return $suggestion;
    }

    /** @return array<string, mixed> */
    private function body(Request $request): array
    {
        $data = '' === $request->getContent() ? [] : json_decode($request->getContent(), true);

        return \is_array($data) ? $data : throw new BadRequestHttpException('Corps JSON attendu.');
    }
}
