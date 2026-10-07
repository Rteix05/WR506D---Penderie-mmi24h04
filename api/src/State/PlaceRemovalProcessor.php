<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Security\CurrentProfile;
use App\Service\Place\DecisionRequired;
use App\Service\Place\PlaceDecisions;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

/**
 * DELETE sur un logement ou une pièce (décisions du 30/09) :
 *  - seul dans son logement : suppression directe, s'il est vide ;
 *  - en colocation, le logement ou une pièce COMMUNE : accord de tous,
 *    jamais un DELETE direct (409, passer par une décision) ;
 *  - une pièce FERMÉE : son créateur la supprime, vide, sans vote.
 *
 * La suppression directe et celle votée passent par PlaceDecisions : une
 * seule règle « vide d'abord » (409 sinon).
 *
 * @implements ProcessorInterface<Place|Room, null>
 */
final class PlaceRemovalProcessor implements ProcessorInterface
{
    public function __construct(
        private readonly PlaceDecisions $decisions,
        private readonly CurrentProfile $current,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        $me = $this->current->get();
        if ($data instanceof Place) {
            if ($data->isShared()) {
                throw new DecisionRequired('En colocation, supprimer le logement demande l\'accord de tous : ouvre une décision.');
            }
            $this->decisions->removeNow($data);

            return null;
        }
        \assert($data instanceof Room);
        if ($data->isClosed()) {
            if (!$data->getCreatedBy()->getId()->equals($me->getId())) {
                throw new AccessDeniedException('Seul celui qui a créé une pièce fermée la supprime.');
            }
        } elseif ($data->getPlace()->isShared()) {
            throw new DecisionRequired('En colocation, supprimer une pièce commune demande l\'accord de tous : ouvre une décision.');
        }
        $this->decisions->removeNow($data);

        return null;
    }
}
