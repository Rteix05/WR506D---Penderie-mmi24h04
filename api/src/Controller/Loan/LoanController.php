<?php

namespace App\Controller\Loan;

use ApiPlatform\Metadata\IriConverterInterface;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Loan\Loan;
use App\Entity\Loan\LoanEvent;
use App\Entity\Notification\Notification;
use App\Entity\Place\Box;
use App\Entity\Place\Room;
use App\Entity\Place\Storage;
use App\Entity\Relation\Friendship;
use App\Entity\Sale\Listing;
use App\Enum\Inventory\Condition;
use App\Enum\Inventory\MoveReason;
use App\Enum\Loan\LoanStatus;
use App\Enum\Notification\NotificationType;
use App\Repository\Loan\LoanRepository;
use App\Security\CurrentProfile;
use App\Service\Inventory\LocationMover;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Uid\Uuid;

/**
 * Le prêt d'objets, exposé : la machine à états de Loan (voir l'entité)
 * devient une suite de gestes, chacun réservé à la bonne partie.
 *
 *  - GET  /api/loans?role=lender|borrower&open=1|0 : mes prêts (« Mes
 *    prêts »), du plus récent au plus ancien.
 *  - GET  /api/loans/{id} : un prêt et son journal (LoanEvent).
 *  - GET  /api/loans/candidates : à qui je peux prêter (mes amis, et les
 *    autres profils de mon compte).
 *  - GET  /api/possessions/loans?possession=IRI : l'historique des prêts
 *    d'un objet, pour son propriétaire.
 *  - POST /api/loans : {possession: IRI, borrower: id, dueDate?, note?}.
 *    Le propriétaire prête de lui-même : le prêt naît ACCEPTED.
 *  - POST /api/loans/request : {possession: IRI, note?}. Quelqu'un qui
 *    voit l'objet demande à l'emprunter : REQUESTED.
 *  - POST /api/loans/{id}/accept {dueDate?} · /decline {reason?} : le
 *    prêteur répond à une demande.
 *  - POST /api/loans/{id}/received : l'emprunteur a l'objet en main ;
 *    le prêt devient ACTIVE et l'objet LENT.
 *  - POST /api/loans/{id}/due-date {dueDate: 'Y-m-d' | null} : le prêteur
 *    repousse ou retire la date de retour.
 *  - POST /api/loans/{id}/declare-return {note?} : l'emprunteur dit
 *    l'avoir rendu ; le prêteur confirme ensuite.
 *  - POST /api/loans/{id}/confirm-return {condition?, note?, room?,
 *    storage?, box?} : le prêteur constate l'état (un dommage est journalisé)
 *    et peut ranger l'objet ailleurs qu'avant (déplacement tracé).
 *  - POST /api/loans/{id}/lost : le prêteur déclare l'objet perdu.
 *  - POST /api/loans/{id}/cancel : l'un ou l'autre, tant que l'objet
 *    n'a pas été remis.
 *
 * Règles en plus de celles de l'entité (pas de prêt à soi-même, seul un
 * objet disponible se prête, donc jamais de sous-prêt) : un objet en vente
 * ne se prête pas ; un objet déjà promis à quelqu'un (prêt accepté) ne
 * se promet pas à un second ; on ne demande pas deux fois le même objet.
 *
 * Un profil enfant prête et emprunte avec l'accord de son tuteur
 * (LOAN_LEND, LOAN_BORROW en REQUIRES_APPROVAL) : tant que le parcours
 * d'accord n'est pas exposé, c'est refusé (PermissionVoter).
 */
final class LoanController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CurrentProfile $current,
        private readonly IriConverterInterface $iris,
        private readonly LoanRepository $loans,
        private readonly LocationMover $mover,
    ) {
    }

    #[Route('/api/loans', name: 'api_loan_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $role = $request->query->get('role');
        if (null !== $role && !\in_array($role, ['lender', 'borrower'], true)) {
            throw new BadRequestHttpException('« role » vaut lender ou borrower.');
        }
        $open = $request->query->has('open') ? $request->query->getBoolean('open') : null;

        return $this->json(array_map(fn (Loan $l) => $this->describe($l), $this->loans->forProfile($this->current->get(), $role, $open)));
    }

    #[Route('/api/loans/candidates', name: 'api_loan_candidates', methods: ['GET'])]
    public function candidates(): JsonResponse
    {
        $me = $this->current->get();
        $people = [];
        foreach ($me->getAccount()->getProfiles() as $profile) {
            if (!$profile->getId()->equals($me->getId()) && !$profile->isGhost()) {
                $people[(string) $profile->getId()] = $this->person($profile) + ['household' => true];
            }
        }
        foreach ($this->em->getRepository(Friendship::class)->friendsOf($me) as $friend) {
            $people[(string) $friend->getId()] ??= $this->person($friend) + ['household' => false];
        }
        usort($people, static fn (array $a, array $b) => strcoll($a['displayName'], $b['displayName']));

        return $this->json($people);
    }

    #[Route('/api/possessions/loans', name: 'api_loan_history', methods: ['GET'])]
    public function history(Request $request): JsonResponse
    {
        $possession = $this->possession($request->query->get('possession'));
        $this->denyAccessUnlessGranted('EDIT', $possession, 'Seul le propriétaire voit l\'historique des prêts de cet objet.');

        return $this->json(array_map(fn (Loan $l) => $this->describe($l), $this->loans->forPossession($possession)));
    }

    #[Route('/api/loans/{id}', name: 'api_loan_show', methods: ['GET'], requirements: ['id' => Requirement::UUID])]
    public function show(string $id): JsonResponse
    {
        return $this->json($this->describe($this->loan($id), withEvents: true));
    }

    /** Le propriétaire prête de lui-même. */
    #[Route('/api/loans', name: 'api_loan_offer', methods: ['POST'])]
    public function offer(Request $request): JsonResponse
    {
        $me = $this->current->get();
        $body = $request->toArray();
        $possession = $this->possession($body['possession'] ?? null);
        if (!$possession->getOwner()->getId()->equals($me->getId())) {
            throw new AccessDeniedHttpException('Seul le propriétaire prête cet objet.');
        }
        $this->denyAccessUnlessGranted('LOAN_LEND', null, 'Ton tuteur doit autoriser les prêts.');
        $borrower = $this->borrower($me, $body['borrower'] ?? null);
        $this->assertLendable($possession);

        $loan = Loan::offer($possession, $borrower, $this->date($body, 'dueDate'), $this->text($body, 'note'));
        $this->em->persist($loan);
        $this->notify($borrower, NotificationType::LoanAccepted, \sprintf('%s te prête « %s »', $me->getDisplayName(), $possession->getName()), $loan, $me);
        $this->em->flush();

        return $this->json($this->describe($loan, withEvents: true), Response::HTTP_CREATED);
    }

    /** Quelqu'un qui voit l'objet demande à l'emprunter. */
    #[Route('/api/loans/request', name: 'api_loan_request', methods: ['POST'])]
    public function request(Request $request): JsonResponse
    {
        $me = $this->current->get();
        $body = $request->toArray();
        $possession = $this->possession($body['possession'] ?? null);
        $this->denyAccessUnlessGranted('LOAN_BORROW', null, 'Ton tuteur doit autoriser les emprunts.');
        foreach ($this->loans->forPossession($possession, open: true) as $open) {
            if ($open->getBorrower()->getId()->equals($me->getId())) {
                throw new ConflictHttpException('Tu as déjà demandé cet objet.');
            }
        }
        if ($this->isListed($possession)) {
            throw new ConflictHttpException('Cet objet est en vente : il ne se prête pas.');
        }

        $loan = Loan::request($possession, $me, $this->text($body, 'note'));
        $this->em->persist($loan);
        $this->notify($loan->getLender(), NotificationType::LoanRequested, \sprintf('%s aimerait emprunter « %s »', $me->getDisplayName(), $possession->getName()), $loan, $me);
        $this->em->flush();

        return $this->json($this->describe($loan, withEvents: true), Response::HTTP_CREATED);
    }

    #[Route('/api/loans/{id}/accept', name: 'api_loan_accept', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function accept(string $id, Request $request): JsonResponse
    {
        $loan = $this->loan($id);
        $me = $this->current->get();
        $this->denyAccessUnlessGranted('LOAN_LEND', null, 'Ton tuteur doit autoriser les prêts.');
        $this->assertLendable($loan->getPossession(), except: $loan);
        $loan->accept($me, $this->date($request->toArray(), 'dueDate'));
        $this->notify($loan->getBorrower(), NotificationType::LoanAccepted, \sprintf('%s accepte de te prêter « %s »', $me->getDisplayName(), $loan->getPossession()->getName()), $loan, $me);

        return $this->done($loan);
    }

    #[Route('/api/loans/{id}/decline', name: 'api_loan_decline', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function decline(string $id, Request $request): JsonResponse
    {
        $loan = $this->loan($id);
        $loan->decline($this->current->get(), $this->text($request->toArray(), 'reason'));

        return $this->done($loan);
    }

    #[Route('/api/loans/{id}/cancel', name: 'api_loan_cancel', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function cancel(string $id): JsonResponse
    {
        $loan = $this->loan($id);
        $loan->cancel($this->current->get());

        return $this->done($loan);
    }

    #[Route('/api/loans/{id}/received', name: 'api_loan_received', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function received(string $id): JsonResponse
    {
        $loan = $this->loan($id);
        $loan->markReceived($this->current->get());

        return $this->done($loan);
    }

    #[Route('/api/loans/{id}/due-date', name: 'api_loan_due_date', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function dueDate(string $id, Request $request): JsonResponse
    {
        $loan = $this->loan($id);
        $body = $request->toArray();
        if (!\array_key_exists('dueDate', $body)) {
            throw new BadRequestHttpException('« dueDate » est attendu (une date, ou null pour la retirer).');
        }
        $loan->changeDueDate($this->current->get(), $this->date($body, 'dueDate'));

        return $this->done($loan);
    }

    #[Route('/api/loans/{id}/declare-return', name: 'api_loan_declare_return', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function declareReturn(string $id, Request $request): JsonResponse
    {
        $loan = $this->loan($id);
        $me = $this->current->get();
        $loan->declareReturn($me, $this->text($request->toArray(), 'note'));
        $this->notify($loan->getLender(), NotificationType::LoanReturned, \sprintf('%s dit t\'avoir rendu « %s »', $me->getDisplayName(), $loan->getPossession()->getName()), $loan, $me);

        return $this->done($loan);
    }

    /**
     * Le prêteur confirme le retour. Avec une pièce (et un rangement, un
     * conteneur), l'objet est rangé là, et le déplacement est tracé
     * (LocationHistory, raison LOAN_RETURN) ; sinon il retrouve sa place.
     */
    #[Route('/api/loans/{id}/confirm-return', name: 'api_loan_confirm_return', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function confirmReturn(string $id, Request $request): JsonResponse
    {
        $loan = $this->loan($id);
        $me = $this->current->get();
        $body = $request->toArray();
        $condition = null;
        if (null !== ($body['condition'] ?? null)) {
            $condition = \is_string($body['condition']) ? Condition::tryFrom($body['condition']) : null;
            if (null === $condition) {
                throw new BadRequestHttpException('« condition » vaut NEW, EXCELLENT, GOOD, WORN ou DAMAGED.');
            }
        }
        $room = $this->resource($body['room'] ?? null, Room::class, 'room');
        $storage = $this->resource($body['storage'] ?? null, Storage::class, 'storage');
        $box = $this->resource($body['box'] ?? null, Box::class, 'box');
        $destination = $box?->getRoom() ?? $room;
        if (null === $destination && null !== $storage) {
            throw new BadRequestHttpException('« room » est obligatoire avec un rangement.');
        }

        // Rien n'est enregistré avant le flush : refuser la pièce après coup annule tout.
        $loan->confirmReturn($me, $condition, $this->text($body, 'note')); // refuse qui n'est pas le prêteur
        if (null !== $destination) {
            $this->denyAccessUnlessGranted('EDIT', $destination, 'Tu ne peux pas ranger d\'objet dans cette pièce.');
            $this->mover->move($loan->getPossession(), $destination, $storage, $box, $me, MoveReason::LoanReturn);
        }

        return $this->done($loan);
    }

    #[Route('/api/loans/{id}/lost', name: 'api_loan_lost', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function lost(string $id): JsonResponse
    {
        $loan = $this->loan($id);
        $loan->declareLost($this->current->get());

        return $this->done($loan);
    }

    // --- Outils -------------------------------------------------------------------

    private function done(Loan $loan): JsonResponse
    {
        $this->em->flush();

        return $this->json($this->describe($loan, withEvents: true));
    }

    /**
     * Un prêt auquel je participe, ou celui d'un enfant dont je suis le
     * tuteur ; sinon 404. Les amis du prêteur et les colocs, qui voient ses
     * prêts dans le tableau des droits, ne les ouvrent pas un par un.
     */
    private function loan(string $id): Loan
    {
        $loan = $this->loans->find($id);
        if (null === $loan || null === $this->roleIn($loan)) {
            throw new NotFoundHttpException('Prêt introuvable.');
        }

        return $loan;
    }

    private function possession(mixed $iri): Item|Garment
    {
        $possession = $this->resource($iri, Item::class, 'possession', alternative: Garment::class);
        if (null === $possession || null !== $possession->getDeletedAt() || !$this->isGranted('VIEW', $possession)) {
            throw new NotFoundHttpException('Objet introuvable.');
        }

        return $possession;
    }

    /** Un ami, ou un autre profil de mon compte. */
    private function borrower(Profile $me, mixed $id): Profile
    {
        if (!\is_string($id) || !Uuid::isValid($id)) {
            throw new BadRequestHttpException('« borrower » est obligatoire (identifiant du profil).');
        }
        $borrower = $this->em->find(Profile::class, $id);
        $household = null !== $borrower && $borrower->getAccount()->getId()->equals($me->getAccount()->getId());
        if (null === $borrower || !($household || $this->em->getRepository(Friendship::class)->areFriends($me, $borrower))) {
            throw new NotFoundHttpException('On ne prête qu\'à un ami, ou à un profil de son compte.');
        }

        return $borrower;
    }

    /**
     * Un objet en vente ne se prête pas (MDD : vente et prêt s'excluent), et
     * un objet déjà promis ou chez quelqu'un ne se promet pas à un second.
     */
    private function assertLendable(Item|Garment $possession, ?Loan $except = null): void
    {
        if ($this->isListed($possession)) {
            throw new ConflictHttpException('Cet objet est en vente : retire l\'annonce pour le prêter.');
        }
        foreach ($this->loans->forPossession($possession, open: true) as $open) {
            if (LoanStatus::Requested !== $open->getStatus() && $open !== $except) {
                throw new ConflictHttpException(\sprintf(LoanStatus::Active === $open->getStatus() ? 'Cet objet est déjà chez %s.' : 'Cet objet est déjà promis à %s.', $open->getBorrower()->getDisplayName()));
            }
        }
    }

    private function isListed(Item|Garment $possession): bool
    {
        foreach ($this->em->getRepository(Listing::class)->findBy([$possession instanceof Item ? 'item' : 'garment' => $possession]) as $listing) {
            if ($listing->isOnSale()) {
                return true;
            }
        }

        return false;
    }

    private function notify(Profile $recipient, NotificationType $type, string $title, Loan $loan, Profile $actor): void
    {
        $this->em->persist(new Notification($recipient, $type, $title, null, ['loan' => (string) $loan->getId()], $actor));
    }

    /** @param array<string, mixed> $body */
    private function date(array $body, string $field): ?\DateTimeImmutable
    {
        $value = $body[$field] ?? null;
        if (null === $value) {
            return null;
        }
        $date = \is_string($value) ? \DateTimeImmutable::createFromFormat('!Y-m-d', $value) : false;
        if (false === $date || $date->format('Y-m-d') !== $value) {
            throw new BadRequestHttpException(\sprintf('« %s » est une date au format AAAA-MM-JJ.', $field));
        }
        if ($date < new \DateTimeImmutable('today')) {
            throw new \DomainException('La date de retour ne peut pas être passée.');
        }

        return $date;
    }

    /** @param array<string, mixed> $body */
    private function text(array $body, string $field): ?string
    {
        $value = $body[$field] ?? null;
        if (null !== $value && (!\is_string($value) || mb_strlen($value) > 1000)) {
            throw new BadRequestHttpException(\sprintf('« %s » est un texte de 1 000 caractères au plus.', $field));
        }

        return null === $value || '' === trim($value) ? null : trim($value);
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

    /** @return 'lender'|'borrower'|'guardian'|null */
    private function roleIn(Loan $loan): ?string
    {
        $me = $this->current->get();
        $is = static fn (Profile $p) => $p->getId()->equals($me->getId());
        $guards = static fn (Profile $p) => null !== $p->getGuardian() && $is($p->getGuardian());

        return match (true) {
            $is($loan->getLender()) => 'lender',
            $is($loan->getBorrower()) => 'borrower',
            $guards($loan->getLender()) || $guards($loan->getBorrower()) => 'guardian',
            default => null,
        };
    }

    /** @return array{id: string, displayName: string, username: string} */
    private function person(Profile $profile): array
    {
        return [
            'id' => (string) $profile->getId(),
            'displayName' => $profile->getDisplayName(),
            'username' => $profile->getUsername(),
        ];
    }

    /** @return array<string, mixed> */
    private function describe(Loan $loan, bool $withEvents = false): array
    {
        $possession = $loan->getPossession();
        $canView = null === $possession->getDeletedAt() && $this->isGranted('VIEW', $possession);
        $date = static fn (?\DateTimeInterface $d) => $d?->format(\DATE_ATOM);

        return [
            'id' => (string) $loan->getId(),
            'status' => $loan->getStatus()->value,
            'overdue' => $loan->isOverdue(),
            'damaged' => $loan->isDamaged(),
            'role' => $this->roleIn($loan),
            'possession' => [
                'id' => (string) $possession->getId(),
                'kind' => $possession instanceof Item ? 'item' : 'garment',
                '@id' => $this->iris->getIriFromResource($possession),
                'name' => $possession->getName(),
                'canView' => $canView,
                'photo' => $canView ? ($possession->getPhotos()[0] ?? null) : null,
            ],
            'lender' => $this->person($loan->getLender()),
            'borrower' => $this->person($loan->getBorrower()),
            'requestedAt' => $date($loan->getRequestedAt()),
            'acceptedAt' => $date($loan->getAcceptedAt()),
            'receivedAt' => $date($loan->getReceivedAt()),
            'dueDate' => $loan->getDueDate()?->format('Y-m-d'),
            'returnDeclaredAt' => $date($loan->getReturnDeclaredAt()),
            'returnConfirmedAt' => $date($loan->getReturnConfirmedAt()),
            'note' => $loan->getNote(),
            'returnNote' => $loan->getReturnNote(),
            'conditionAtStart' => $loan->getConditionAtStart()?->value,
            'conditionAtReturn' => $loan->getConditionAtReturn()?->value,
        ] + ($withEvents ? ['events' => array_values(array_map(static fn (LoanEvent $e) => [
            'type' => $e->getType()->value,
            'actor' => $e->getActor()?->getDisplayName(),
            'occurredAt' => $e->getOccurredAt()->format(\DATE_ATOM),
            'payload' => $e->getPayload(),
        ], $loan->getEvents()->toArray()))] : []);
    }
}
