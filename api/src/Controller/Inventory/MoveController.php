<?php

namespace App\Controller\Inventory;

use ApiPlatform\Metadata\IriConverterInterface;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Inventory\LocationHistory;
use App\Entity\Place\Box;
use App\Entity\Place\Room;
use App\Entity\Place\Storage;
use App\Enum\Inventory\MoveReason;
use App\Security\CurrentProfile;
use App\Security\ResourceAccess;
use App\Service\Inventory\LocationMover;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;

/**
 * Déplacer, exposé : LocationMover existait (c'est le seul à écrire
 * LocationHistory et à garder la cascade Pièce ▸ Rangement ▸ Conteneur
 * cohérente), mais aucune route n'y menait. Un PATCH ne change jamais
 * l'emplacement (MDD : « déplacer est une action, jamais un statut »).
 *
 *  - POST /api/items/{id}/move, /api/garments/{id}/move :
 *    {room, storage?, box?}. Un conteneur impose sa pièce et son rangement.
 *  - POST /api/boxes/{id}/move : {room, storage?} — le conteneur et tout ce
 *    qu'il contient (chaque objet garde une trace, raison BOX_MOVED).
 *  - POST /api/storages/{id}/move : {room} — le meuble, ses conteneurs et
 *    tout ce qui est rangé dessus ou dedans.
 *  - GET  /api/possessions/moves?possession=IRI : l'historique des
 *    emplacements quittés, du plus récent au plus ancien.
 *
 * Droits : déplacer un objet, c'est pouvoir le modifier (EDIT : son
 * propriétaire, son tuteur) et pouvoir ranger dans la pièce d'arrivée
 * (EDIT sur la pièce). Un conteneur ou un meuble ne se déplace que par
 * celui qui l'a créé (ou son tuteur) : un coloc ne déménage pas avec lui
 * les affaires des autres. Un objet prêté se déplace aussi : c'est sa
 * place habituelle qui change, il y reviendra au retour.
 */
final class MoveController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly IriConverterInterface $iris,
        private readonly LocationMover $mover,
        private readonly CurrentProfile $current,
        private readonly ResourceAccess $access,
    ) {
    }

    #[Route('/api/items/{id}/move', name: 'api_move_item', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function item(string $id, Request $request): JsonResponse
    {
        return $this->movePossession($this->em->find(Item::class, $id), $request);
    }

    #[Route('/api/garments/{id}/move', name: 'api_move_garment', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function garment(string $id, Request $request): JsonResponse
    {
        return $this->movePossession($this->em->find(Garment::class, $id), $request);
    }

    #[Route('/api/boxes/{id}/move', name: 'api_move_box', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function box(string $id, Request $request): JsonResponse
    {
        $box = $this->em->find(Box::class, $id);
        if (null === $box || !$this->isGranted('VIEW', $box)) {
            throw new NotFoundHttpException('Conteneur introuvable.');
        }
        $this->assertCreator($box, 'Seul celui qui a créé ce conteneur le déplace.');
        $body = $request->toArray();
        $room = $this->destination($body);
        $storage = $this->resource($body['storage'] ?? null, Storage::class, 'storage');
        $this->assertStorageIn($storage, $room);

        $this->mover->moveBox($box, $room, $storage, $this->current->get());

        return $this->json(['id' => (string) $box->getId(), '@id' => $this->iris->getIriFromResource($box), 'room' => $this->iri($room), 'storage' => $this->iri($storage)]);
    }

    #[Route('/api/storages/{id}/move', name: 'api_move_storage', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function storage(string $id, Request $request): JsonResponse
    {
        $storage = $this->em->find(Storage::class, $id);
        if (null === $storage || !$this->isGranted('VIEW', $storage)) {
            throw new NotFoundHttpException('Rangement introuvable.');
        }
        $this->assertCreator($storage, 'Seul celui qui a créé ce rangement le déplace.');
        $room = $this->destination($request->toArray());

        $this->mover->moveStorage($storage, $room, $this->current->get());

        return $this->json(['id' => (string) $storage->getId(), '@id' => $this->iris->getIriFromResource($storage), 'room' => $this->iri($room)]);
    }

    #[Route('/api/possessions/moves', name: 'api_move_history', methods: ['GET'])]
    public function history(Request $request): JsonResponse
    {
        $possession = $this->resource($request->query->get('possession'), Item::class, 'possession', alternative: Garment::class);
        if (null === $possession || null !== $possession->getDeletedAt() || !$this->isGranted('VIEW', $possession)) {
            throw new NotFoundHttpException('Objet introuvable.');
        }
        if (!$this->access->canSeeLocation($this->current->get(), $possession)) {
            throw new AccessDeniedHttpException('Tu ne vois pas où cet objet est rangé.');
        }
        $moves = $this->em->getRepository(LocationHistory::class)->findBy([$possession instanceof Item ? 'item' : 'garment' => $possession], ['movedAt' => 'DESC'], 50);

        return $this->json(array_map(fn (LocationHistory $m) => [
            'room' => ['@id' => $this->iri($m->getRoom()), 'name' => $m->getRoom()->getName(), 'place' => $m->getRoom()->getPlace()->getName()],
            'storage' => null === $m->getStorage() ? null : ['@id' => $this->iri($m->getStorage()), 'name' => $m->getStorage()->getName()],
            'box' => null === $m->getBox() ? null : ['@id' => $this->iri($m->getBox()), 'name' => $m->getBox()->getName()],
            'movedBy' => $m->getMovedBy()->getDisplayName(),
            'reason' => $m->getReason()->value,
            'movedAt' => $m->getMovedAt()->format(\DATE_ATOM),
        ], $moves));
    }

    // --- Outils -------------------------------------------------------------------

    private function movePossession(Item|Garment|null $possession, Request $request): JsonResponse
    {
        if (null === $possession || null !== $possession->getDeletedAt() || !$this->isGranted('VIEW', $possession)) {
            throw new NotFoundHttpException('Objet introuvable.');
        }
        $this->denyAccessUnlessGranted('EDIT', $possession, 'Seul le propriétaire déplace cet objet.');
        $body = $request->toArray();
        $box = $this->resource($body['box'] ?? null, Box::class, 'box');
        // Le conteneur impose sa pièce et son rangement : room devient facultative.
        $room = null !== $box ? $box->getRoom() : $this->destination($body);
        $storage = null !== $box ? $box->getStorage() : $this->resource($body['storage'] ?? null, Storage::class, 'storage');
        if (null !== $box) {
            $this->denyAccessUnlessGranted('EDIT', $room, 'Tu ne peux pas ranger d\'objet dans cette pièce.');
        }
        $this->assertStorageIn($storage, $room);

        // LocationMover refuse un vêtement « à compléter » (jamais rangé) : il se range en le complétant.
        $this->mover->move($possession, $room, $storage, $box, $this->current->get(), MoveReason::ManualMove);

        return $this->json([
            'id' => (string) $possession->getId(),
            '@id' => $this->iris->getIriFromResource($possession),
            'room' => $this->iri($possession->getRoom()),
            'storage' => $this->iri($possession->getStorage()),
            'box' => $this->iri($possession->getBox()),
        ]);
    }

    /**
     * La pièce d'arrivée, obligatoire, où l'on a le droit de ranger.
     *
     * @param array<string, mixed> $body
     */
    private function destination(array $body): Room
    {
        $room = $this->resource($body['room'] ?? null, Room::class, 'room');
        if (null === $room) {
            throw new BadRequestHttpException('« room » est obligatoire (IRI de la pièce d\'arrivée).');
        }
        $this->denyAccessUnlessGranted('EDIT', $room, 'Tu ne peux pas ranger d\'objet dans cette pièce.');

        return $room;
    }

    /** Un rangement d'une autre pièce : refusé, comme à la création (ValidLocation). */
    private function assertStorageIn(?Storage $storage, Room $room): void
    {
        if (null !== $storage && !$storage->getRoom()->getId()->equals($room->getId())) {
            throw new \DomainException('Ce rangement n\'est pas dans cette pièce.');
        }
    }

    private function assertCreator(Box|Storage $resource, string $message): void
    {
        if (!$this->access->isOwner($this->current->get(), $resource)) {
            throw new AccessDeniedHttpException($message);
        }
    }

    private function iri(?object $resource): ?string
    {
        return null === $resource ? null : $this->iris->getIriFromResource($resource);
    }

    /**
     * @template T of object
     * @template U of object
     *
     * @param class-string<T>      $class
     * @param class-string<U>|null $alternative
     *
     * @return T|U|null
     */
    private function resource(mixed $iri, string $class, string $field, ?string $alternative = null): ?object
    {
        if (null === $iri) {
            return null;
        }
        if (!\is_string($iri)) {
            throw new BadRequestHttpException(\sprintf('« %s » est une IRI.', $field));
        }
        try {
            $resource = $this->iris->getResourceFromIri($iri);
        } catch (\Throwable) {
            throw new BadRequestHttpException(\sprintf('« %s » : IRI inconnue.', $field));
        }
        if (!$resource instanceof $class && (null === $alternative || !$resource instanceof $alternative)) {
            throw new BadRequestHttpException(\sprintf('« %s » ne désigne pas le bon type de ressource.', $field));
        }

        return $resource;
    }
}
