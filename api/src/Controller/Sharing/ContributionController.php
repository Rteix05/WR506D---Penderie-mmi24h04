<?php

namespace App\Controller\Sharing;

use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Media\Media;
use App\Entity\Place\Box;
use App\Entity\Place\Room;
use App\Entity\Place\Storage;
use App\Entity\Sharing\CollectionShare;
use App\Entity\Sharing\Contribution;
use App\Entity\Sharing\Share;
use App\Enum\Sharing\ContributionKind;
use App\Enum\Sharing\ContributionStatus;
use App\Security\CurrentProfile;
use App\Security\ResourceAccess;
use App\Service\Sharing\ContributionReviewer;
use App\Service\Sharing\ShareTargets;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

/**
 * Proposer une modification et la faire valider par le propriétaire. Rien
 * n'est appliqué avant son accord. On peut proposer grâce à un partage
 * « Modifier » à son nom, ou au sein du foyer (autre profil du même
 * compte, dans les limites du tableau des droits).
 */
#[Route('/api/contributions')]
final class ContributionController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CurrentProfile $current,
        private readonly ResourceAccess $access,
        private readonly ShareTargets $targets,
        private readonly ContributionReviewer $reviewer,
    ) {
    }

    /**
     * Corps, selon kind :
     *  - PLACE_POSSESSION     : {possessionType: ITEM|GARMENT, possessionId, roomId, storageId?, boxId?}
     *  - ADD_COLLECTION_ENTRY : {collectionId, itemId? | garmentId? | mediaId? | text?, caption?}
     *  - EDIT_FIELDS          : {targetType, targetId, changes: {name?, description?}}
     *    (targetType : ITEM, GARMENT, PLACE, ROOM, STORAGE, BOX, COLLECTION, OUTFIT,
     *    GARMENT_CATEGORY, ITEM_CATEGORY)
     */
    #[Route('', name: 'api_contribution_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $me = $this->current->get();
        $b = $request->toArray();

        $contribution = match (ContributionKind::from((string) ($b['kind'] ?? ''))) {
            ContributionKind::PlacePossession => $this->placePossession($b),
            ContributionKind::AddCollectionEntry => $this->addToCollection($b),
            ContributionKind::EditFields => $this->editFields($b),
        };
        $this->em->persist($contribution);
        $this->em->flush();

        return $this->json($this->describe($contribution), Response::HTTP_CREATED);
    }

    /** À valider (je suis le propriétaire) et mes propositions. */
    #[Route('', name: 'api_contribution_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $me = $this->current->get();
        $toReview = $this->em->createQueryBuilder()->select('c')->from(Contribution::class, 'c')
            ->join('c.owner', 'o')
            ->where('o = :me OR o.guardian = :me')->andWhere('c.status = :pending')
            ->setParameter('me', $me->getId(), 'uuid')->setParameter('pending', ContributionStatus::Pending->value)
            ->getQuery()->getResult();
        $mine = $this->em->getRepository(Contribution::class)->findBy(['contributor' => $me], ['createdAt' => 'DESC']);

        return $this->json([
            'toReview' => array_map($this->describe(...), $toReview),
            'mine' => array_map($this->describe(...), $mine),
        ]);
    }

    #[Route('/{id}/accept', name: 'api_contribution_accept', methods: ['POST'])]
    public function accept(string $id): JsonResponse
    {
        $contribution = $this->loadForReview($id);
        $this->reviewer->accept($contribution, $this->current->get());

        return $this->json($this->describe($contribution));
    }

    #[Route('/{id}/reject', name: 'api_contribution_reject', methods: ['POST'])]
    public function reject(string $id, Request $request): JsonResponse
    {
        $contribution = $this->loadForReview($id);
        $note = '' !== $request->getContent() ? ($request->toArray()['note'] ?? null) : null;
        $contribution->reject($this->current->get(), $note);
        $this->em->flush();

        return $this->json($this->describe($contribution));
    }

    #[Route('/{id}/withdraw', name: 'api_contribution_withdraw', methods: ['POST'])]
    public function withdraw(string $id): JsonResponse
    {
        $contribution = $this->load($id);
        $contribution->withdraw($this->current->get());
        $this->em->flush();

        return $this->json($this->describe($contribution));
    }

    /** @param array<string, mixed> $b */
    private function placePossession(array $b): Contribution
    {
        $me = $this->current->get();
        $possession = $this->em->find('GARMENT' === ($b['possessionType'] ?? 'ITEM') ? Garment::class : Item::class, (string) ($b['possessionId'] ?? ''))
            ?? throw $this->createNotFoundException('Objet introuvable.');
        $room = $this->em->find(Room::class, (string) ($b['roomId'] ?? '')) ?? throw $this->createNotFoundException('Pièce introuvable.');
        $storage = isset($b['storageId']) ? $this->em->find(Storage::class, (string) $b['storageId']) : null;
        $box = isset($b['boxId']) ? $this->em->find(Box::class, (string) $b['boxId']) : null;

        // Un partage « Modifier » du conteneur, du rangement, de la pièce ou du logement qui accueille l'objet…
        $storage = $box?->getStorage() ?? $storage;
        $grant = (null !== $box ? $this->access->editGrant($me, $box) : null)
            ?? (null !== $storage ? $this->access->editGrant($me, $storage) : null)
            ?? $this->access->editGrant($me, $room)
            ?? $this->access->editGrant($me, $room->getPlace());
        // … ou le foyer, sur cet emplacement précis.
        if (null === $grant && !$this->access->householdMayPropose($me, $box ?? $storage ?? $room)) {
            throw new AccessDeniedException('Aucun droit de proposer un rangement ici.');
        }

        return Contribution::placePossession($me, $grant, $possession, $room, $storage, $box);
    }

    /** @param array<string, mixed> $b */
    private function addToCollection(array $b): Contribution
    {
        $collection = $this->targets->find('COLLECTION', (string) ($b['collectionId'] ?? ''));
        $grant = $this->grantOn($collection);
        \assert($grant instanceof CollectionShare);
        $content = match (true) {
            isset($b['itemId']) => $this->em->find(Item::class, (string) $b['itemId']),
            isset($b['garmentId']) => $this->em->find(Garment::class, (string) $b['garmentId']),
            isset($b['mediaId']) => $this->em->find(Media::class, (string) $b['mediaId']),
            default => (string) ($b['text'] ?? ''),
        } ?? throw $this->createNotFoundException('Élément introuvable.');

        return Contribution::addToCollection($this->current->get(), $grant, $content, $b['caption'] ?? null);
    }

    /** @param array<string, mixed> $b */
    private function editFields(array $b): Contribution
    {
        $me = $this->current->get();
        $target = $this->targets->find((string) ($b['targetType'] ?? ''), (string) ($b['targetId'] ?? ''));
        $grant = $this->access->editGrant($me, $target);
        if (null === $grant && !$this->access->householdMayPropose($me, $target)) {
            throw new AccessDeniedException('Aucun droit de proposer une modification ici.');
        }

        return Contribution::editFields($me, $grant, $target, (array) ($b['changes'] ?? []));
    }

    private function grantOn(object $target): Share
    {
        return $this->access->editGrant($this->current->get(), $target)
            ?? throw new AccessDeniedException('Aucun droit de modifier sur cette ressource.');
    }

    private function load(string $id): Contribution
    {
        return $this->em->find(Contribution::class, $id) ?? throw $this->createNotFoundException();
    }

    /** Seuls le propriétaire et son tuteur décident : les autres reçoivent un 403, pas une règle métier. */
    private function loadForReview(string $id): Contribution
    {
        $contribution = $this->load($id);
        $me = $this->current->get();
        $owner = $contribution->getOwner();
        if (!$owner->getId()->equals($me->getId()) && !($owner->getGuardian()?->getId()->equals($me->getId()) ?? false)) {
            throw new AccessDeniedException('Seul le propriétaire valide une proposition.');
        }

        return $contribution;
    }

    /** @return array<string, mixed> */
    private function describe(Contribution $c): array
    {
        return array_filter([
            'id' => (string) $c->getId(),
            'kind' => $c->getKind()->value,
            'basis' => $c->getBasis()->value,
            'status' => $c->getStatus()->value,
            'contributor' => $c->getContributor()->getDisplayName(),
            'owner' => $c->getOwner()->getDisplayName(),
            'possession' => $c->getPossession()?->getName(),
            'room' => $c->getRoom()?->getName(),
            'collection' => $c->getCollection()?->getName(),
            'caption' => $c->getCaption(),
            'changes' => $c->getChanges(),
            'target' => null !== $c->getTargetType() ? ['type' => $c->getTargetType(), 'id' => (string) $c->getTargetId()] : null,
            'note' => $c->getNote(),
        ], static fn ($v) => null !== $v);
    }
}
