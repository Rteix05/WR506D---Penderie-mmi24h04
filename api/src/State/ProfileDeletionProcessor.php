<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Identity\Profile;
use App\Security\CurrentProfile;
use App\Service\Identity\ProfileDeleter;

/**
 * DELETE /api/profiles/{id} : le tuteur supprime le profil d'un enfant.
 * Toute la procédure (transferts, profil fantôme, blocages) vit dans
 * ProfileDeleter ; ici, on ne fait que désigner l'auteur de la demande.
 *
 * @implements ProcessorInterface<Profile, null>
 */
final class ProfileDeletionProcessor implements ProcessorInterface
{
    public function __construct(
        private readonly ProfileDeleter $deleter,
        private readonly CurrentProfile $current,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        \assert($data instanceof Profile);
        $this->deleter->deleteChild($data, $this->current->get());

        return null;
    }
}
