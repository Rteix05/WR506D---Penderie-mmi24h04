<?php

namespace App\Controller\Place;

use App\Entity\Identity\Profile;
use App\Entity\Place\Place;
use App\Entity\Place\PlaceDecision;
use App\Entity\Place\PlaceDecisionVote;
use App\Entity\Place\Room;
use App\Enum\Place\PlaceDecisionKind;
use App\Enum\Place\PlaceDecisionStatus;
use App\Security\CurrentProfile;
use App\Service\Place\PlaceDecisions;
use App\Service\Place\PlaceLeaver;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

/**
 * La colocation (décisions du 30/09) : les membres, les décisions prises
 * à l'unanimité (inviter, supprimer le logement, supprimer une pièce
 * commune) et leurs votes, le départ, et les pièces fermées.
 */
final class FlatshareController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CurrentProfile $current,
        private readonly PlaceDecisions $decisions,
        private readonly PlaceLeaver $leaver,
    ) {
    }

    #[Route('/api/places/{id}/members', name: 'api_flatshare_members', methods: ['GET'])]
    public function members(string $id): JsonResponse
    {
        $place = $this->placeOfMember($id);

        return $this->json(array_map(fn ($m) => [
            'profileId' => (string) $m->getProfile()->getId(),
            'displayName' => $m->getProfile()->getDisplayName(),
            'joinedAt' => $m->getJoinedAt()?->format(\DATE_ATOM),
            'referent' => $m->getProfile()->getId()->equals($place->getOwner()->getId()),
        ], $place->getMembers()->toArray()));
    }

    #[Route('/api/places/{id}/decisions', name: 'api_flatshare_decisions', methods: ['GET'])]
    public function decisions(string $id): JsonResponse
    {
        $place = $this->placeOfMember($id);
        $all = $this->em->getRepository(PlaceDecision::class)->findBy(['place' => $place], ['createdAt' => 'DESC']);

        return $this->json(array_map($this->describe(...), $all));
    }

    /** Corps : {kind: INVITE_MEMBER, inviteeId} | {kind: DELETE_PLACE} | {kind: DELETE_ROOM, roomId} */
    #[Route('/api/places/{id}/decisions', name: 'api_flatshare_decide', methods: ['POST'])]
    public function decide(string $id, Request $request): JsonResponse
    {
        $place = $this->placeOfMember($id);
        $me = $this->current->get();
        $body = $request->toArray();
        $decision = match (PlaceDecisionKind::from((string) ($body['kind'] ?? ''))) {
            PlaceDecisionKind::InviteMember => $this->decisions->invite($place, $me, $this->profile((string) ($body['inviteeId'] ?? ''))),
            PlaceDecisionKind::DeletePlace => $this->decisions->deletePlace($place, $me),
            PlaceDecisionKind::DeleteRoom => $this->decisions->deleteRoom($this->roomIn($place, (string) ($body['roomId'] ?? '')), $me),
        };

        return $this->json($this->describe($decision), Response::HTTP_CREATED);
    }

    /** Les décisions où l'on attend MON vote (dont les invitations que je reçois). */
    #[Route('/api/place_decisions/awaiting', name: 'api_flatshare_awaiting', methods: ['GET'])]
    public function awaiting(): JsonResponse
    {
        $me = $this->current->get();
        $pending = $this->em->getRepository(PlaceDecision::class)->findBy(['status' => PlaceDecisionStatus::Pending]);
        $mine = array_filter($pending, static fn (PlaceDecision $d) => $d->isVoter($me) && null === $d->voteOf($me));

        return $this->json(array_values(array_map($this->describe(...), $mine)));
    }

    #[Route('/api/place_decisions/{id}/approve', name: 'api_flatshare_approve', methods: ['POST'])]
    public function approve(string $id): JsonResponse
    {
        $decision = $this->decision($id);
        $this->decisions->vote($decision, $this->current->get(), true);

        return $this->json($this->describe($decision));
    }

    #[Route('/api/place_decisions/{id}/reject', name: 'api_flatshare_reject', methods: ['POST'])]
    public function reject(string $id): JsonResponse
    {
        $decision = $this->decision($id);
        $this->decisions->vote($decision, $this->current->get(), false);

        return $this->json($this->describe($decision));
    }

    #[Route('/api/place_decisions/{id}/cancel', name: 'api_flatshare_cancel', methods: ['POST'])]
    public function cancel(string $id): JsonResponse
    {
        $decision = $this->decision($id);
        $decision->cancel($this->current->get());
        $this->em->flush();

        return $this->json($this->describe($decision));
    }

    /** Corps : {mode: TAKE, roomId} (une de mes pièces, ailleurs) | {mode: TRANSFER, heirId} (un coloc) */
    #[Route('/api/places/{id}/leave', name: 'api_flatshare_leave', methods: ['POST'])]
    public function leave(string $id, Request $request): JsonResponse
    {
        $place = $this->placeOfMember($id);
        $body = $request->toArray();
        $room = isset($body['roomId']) ? $this->em->find(Room::class, (string) $body['roomId']) : null;
        $heir = isset($body['heirId']) ? $this->profile((string) $body['heirId']) : null;
        $this->leaver->leave($place, $this->current->get(), (string) ($body['mode'] ?? ''), $room, $heir);

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/rooms/{id}/close', name: 'api_flatshare_room_close', methods: ['POST'])]
    public function close(string $id): JsonResponse
    {
        $room = $this->roomOfMember($id);
        $room->close($this->current->get());
        $this->em->flush();

        return $this->json($this->describeRoom($room));
    }

    #[Route('/api/rooms/{id}/open', name: 'api_flatshare_room_open', methods: ['POST'])]
    public function open(string $id): JsonResponse
    {
        $room = $this->roomOfMember($id);
        $room->open($this->current->get());
        $this->em->flush();

        return $this->json($this->describeRoom($room));
    }

    /** Corps : {profileId} — le créateur autorise un coloc dans sa pièce fermée. */
    #[Route('/api/rooms/{id}/allowed', name: 'api_flatshare_room_allow', methods: ['POST'])]
    public function allow(string $id, Request $request): JsonResponse
    {
        $room = $this->roomOfMember($id);
        $room->allow($this->current->get(), $this->profile((string) ($request->toArray()['profileId'] ?? '')));
        $this->em->flush();

        return $this->json($this->describeRoom($room));
    }

    #[Route('/api/rooms/{id}/allowed/{profileId}', name: 'api_flatshare_room_disallow', methods: ['DELETE'])]
    public function disallow(string $id, string $profileId): JsonResponse
    {
        $room = $this->roomOfMember($id);
        $room->disallow($this->current->get(), $this->profile($profileId));
        $this->em->flush();

        return $this->json($this->describeRoom($room));
    }

    private function placeOfMember(string $id): Place
    {
        $place = $this->em->find(Place::class, $id) ?? throw $this->createNotFoundException();
        if (!$place->hasMember($this->current->get())) {
            throw new AccessDeniedException('Réservé aux membres du logement.');
        }

        return $place;
    }

    private function roomOfMember(string $id): Room
    {
        $room = $this->em->find(Room::class, $id) ?? throw $this->createNotFoundException();
        if (!$room->getPlace()->hasMember($this->current->get())) {
            throw new AccessDeniedException('Réservé aux membres du logement.');
        }

        return $room;
    }

    private function roomIn(Place $place, string $roomId): Room
    {
        $room = $this->em->find(Room::class, $roomId);
        if (null === $room || !$room->getPlace()->getId()->equals($place->getId())) {
            throw $this->createNotFoundException('Pièce introuvable dans ce logement.');
        }

        return $room;
    }

    private function decision(string $id): PlaceDecision
    {
        return $this->em->find(PlaceDecision::class, $id) ?? throw $this->createNotFoundException();
    }

    private function profile(string $id): Profile
    {
        return $this->em->find(Profile::class, $id) ?? throw $this->createNotFoundException('Profil introuvable.');
    }

    /** @return array<string, mixed> */
    private function describe(PlaceDecision $d): array
    {
        return array_filter([
            'id' => (string) $d->getId(),
            'placeId' => (string) $d->getPlace()->getId(),
            'kind' => $d->getKind()->value,
            'status' => $d->getStatus()->value,
            'requestedBy' => $d->getRequestedBy()->getDisplayName(),
            'invitee' => $d->getInvitee()?->getDisplayName(),
            'roomId' => null !== $d->getRoom() ? (string) $d->getRoom()->getId() : null,
            'votes' => array_map(static fn (PlaceDecisionVote $v) => ['voter' => $v->getVoter()->getDisplayName(), 'approval' => $v->isApproval()], $d->getVotes()->toArray()),
            'awaiting' => array_values(array_map(static fn (Profile $p) => $p->getDisplayName(), array_filter($d->voters(), static fn (Profile $p) => null === $d->voteOf($p)))),
        ], static fn ($v) => null !== $v);
    }

    /** @return array<string, mixed> */
    private function describeRoom(Room $room): array
    {
        return [
            'id' => (string) $room->getId(),
            'name' => $room->getName(),
            'closed' => $room->isClosed(),
            'allowed' => array_map(static fn (Profile $p) => (string) $p->getId(), $room->getAllowedMembers()->toArray()),
        ];
    }
}
