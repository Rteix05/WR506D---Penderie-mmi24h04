<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use App\Entity\Place\Storage;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Partage d'une ressource précise : un rangement (étagère, penderie…) et ce qu'il contient, conteneurs compris (sauf les objets personnels).
 *
 * CASCADE : si la cible disparaît réellement, son partage n'a plus
 * d'objet. Une cible supprimée en douceur garde son partage.
 */
#[ORM\Entity]
class StorageShare extends Share
{
    #[ORM\ManyToOne(targetEntity: Storage::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private Storage $storage;

    /**
     * @param Share|null $grant pour un repartage par une personne autorisée à modifier
     */
    public function __construct(Profile $sharedBy, Storage $storage, ShareAudience $audience, AccessLevel $accessLevel = AccessLevel::Read, ?Share $grant = null)
    {
        // La cible d'abord : le constructeur parent en déduit le propriétaire.
        $this->storage = $storage;
        parent::__construct($sharedBy, $audience, $accessLevel, $grant);
    }

    public function getStorage(): Storage
    {
        return $this->storage;
    }

    public function getTargetOwner(): Profile
    {
        return $this->storage->getOwner();
    }

    public function getTargetId(): Uuid
    {
        return $this->storage->getId();
    }
}
