<?php

namespace App\Controller\Reference;

use ApiPlatform\Metadata\IriConverterInterface;
use App\Entity\Reference\Brand;
use App\Security\CurrentProfile;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * POST /api/brands { "name": "Trapstar" } : ajouter une marque absente de
 * la liste (décisions du 29/09, voir Brand). Elle naît « non vérifiée »,
 * rattachée au profil actif, en attente de validation par l'admin.
 *
 * Trouver ou créer : si une marque de même slug existe déjà (« TRAPSTAR »,
 * « trapstar », « Trap Star »), on la renvoie (200) au lieu d'un doublon.
 * Le scan peut ainsi proposer la marque qu'il a lue, et l'app l'envoyer
 * telle quelle à l'enregistrement, sans se soucier de la casse.
 */
final class BrandController extends AbstractController
{
    private const MAX_LENGTH = 80;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CurrentProfile $current,
        private readonly IriConverterInterface $iris,
    ) {
    }

    #[Route('/api/brands', name: 'api_brand_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $payload = json_decode($request->getContent(), true);
        $name = \is_array($payload) && \is_string($payload['name'] ?? null) ? trim($payload['name']) : '';

        $error = match (true) {
            '' === $name => 'Ce champ est obligatoire.',
            mb_strlen($name) > self::MAX_LENGTH => \sprintf('%d caractères au plus.', self::MAX_LENGTH),
            '' === Brand::slugify($name) => 'Ce nom de marque ne contient aucune lettre ni aucun chiffre.',
            default => null,
        };
        if (null !== $error) {
            return $this->json(['title' => 'Données invalides', 'violations' => [['propertyPath' => 'name', 'message' => $error]]], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $existing = $this->em->getRepository(Brand::class)->findOneBy(['slug' => Brand::slugify($name)]);
        if (null !== $existing) {
            return $this->json($this->normalize($existing), Response::HTTP_OK);
        }

        $brand = Brand::proposedBy($name, $this->current->get());
        $this->em->persist($brand);
        $this->em->flush();

        return $this->json($this->normalize($brand), Response::HTTP_CREATED);
    }

    /** Même forme que GET /api/brands/{id} (groupe brand:read), avec l'IRI. */
    private function normalize(Brand $brand): array
    {
        return [
            '@id' => $this->iris->getIriFromResource($brand),
            '@type' => 'Brand',
            'id' => (string) $brand->getId(),
            'name' => $brand->getName(),
            'slug' => $brand->getSlug(),
        ];
    }
}
