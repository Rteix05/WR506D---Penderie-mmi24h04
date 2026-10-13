<?php

namespace App\Controller\Inventory;

use ApiPlatform\Metadata\IriConverterInterface;
use App\Entity\Inventory\Garment;
use App\Entity\Place\Box;
use App\Entity\Place\Room;
use App\Entity\Place\Storage;
use App\Entity\Reference\GarmentCategory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Validator\ConstraintViolationInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Terminer un vêtement « à compléter » (créé d'un titre depuis le look du
 * jour) : POST /api/garments/{id}/complete {category, room, storage?, box?}.
 *
 * Ce sont les deux informations qu'un PATCH ne peut pas écrire (la
 * catégorie et l'emplacement se donnent à la création ; ensuite on
 * déplace). Le reste (taille, couleurs, marque…) passe par la
 * modification habituelle, PATCH /api/garments/{id}.
 */
final class GarmentCompletionController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly IriConverterInterface $iris,
        private readonly ValidatorInterface $validator,
    ) {
    }

    #[Route('/api/garments/{id}/complete', name: 'api_garment_complete', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function complete(string $id, Request $request): JsonResponse
    {
        $garment = $this->em->find(Garment::class, $id);
        if (null === $garment || null !== $garment->getDeletedAt() || !$this->isGranted('VIEW', $garment)) {
            throw new NotFoundHttpException('Vêtement introuvable.');
        }
        $this->denyAccessUnlessGranted('EDIT', $garment);
        $this->denyAccessUnlessGranted('GARMENT_MANAGE');

        $body = $request->toArray();
        $category = $this->resource($body['category'] ?? null, GarmentCategory::class, 'category', required: true);
        $room = $this->resource($body['room'] ?? null, Room::class, 'room', required: true);
        $storage = $this->resource($body['storage'] ?? null, Storage::class, 'storage');
        $box = $this->resource($body['box'] ?? null, Box::class, 'box');
        // Ranger quelque part, c'est pouvoir y ranger (comme à la création).
        $this->denyAccessUnlessGranted('EDIT', $box?->getRoom() ?? $room);
        // Une catégorie de l'application, ou une des siennes.
        if (null !== $category->getOwner() && !$this->isGranted('VIEW', $category)) {
            throw new BadRequestHttpException('« category » : catégorie inconnue.');
        }

        $garment->complete($category, $room, $storage, $box); // refuse un vêtement déjà complet
        $violations = $this->validator->validate($garment);
        if (\count($violations) > 0) {
            return $this->json([
                'title' => 'Vêtement invalide',
                'violations' => array_map(static fn (ConstraintViolationInterface $v) => ['propertyPath' => $v->getPropertyPath(), 'message' => $v->getMessage()], iterator_to_array($violations)),
            ], 422);
        }
        $this->em->flush();

        return $this->json([
            'id' => (string) $garment->getId(),
            '@id' => $this->iris->getIriFromResource($garment),
            'incomplete' => $garment->isIncomplete(),
        ]);
    }

    /**
     * @template T of object
     *
     * @param class-string<T> $class
     *
     * @return T|null
     */
    private function resource(mixed $iri, string $class, string $field, bool $required = false): ?object
    {
        if (null === $iri && !$required) {
            return null;
        }
        if (!\is_string($iri)) {
            throw new BadRequestHttpException(\sprintf('« %s » est obligatoire (IRI).', $field));
        }
        try {
            $resource = $this->iris->getResourceFromIri($iri);
        } catch (\Throwable) {
            throw new BadRequestHttpException(\sprintf('« %s » : IRI inconnue.', $field));
        }
        if (!$resource instanceof $class) {
            throw new BadRequestHttpException(\sprintf('« %s » ne désigne pas le bon type de ressource.', $field));
        }

        return $resource;
    }
}
