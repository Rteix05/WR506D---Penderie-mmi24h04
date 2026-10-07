<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Partage d'une ressource précise : une collection ou un moodboard.
 *
 * CASCADE : si la cible disparaît réellement, son partage n'a plus
 * d'objet. Une cible supprimée en douceur garde son partage.
 */
#[ORM\Entity]
class CollectionShare extends Share
{
    #[ORM\ManyToOne(targetEntity: Collection::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private Collection $collection;

    /**
     * @param Share|null $grant pour un repartage par une personne autorisée à modifier
     */
    public function __construct(Profile $sharedBy, Collection $collection, ShareAudience $audience, AccessLevel $accessLevel = AccessLevel::Read, ?Share $grant = null)
    {
        // La cible d'abord : le constructeur parent en déduit le propriétaire.
        $this->collection = $collection;
        parent::__construct($sharedBy, $audience, $accessLevel, $grant);
    }

    public function getCollection(): Collection
    {
        return $this->collection;
    }

    public function getTargetOwner(): Profile
    {
        return $this->collection->getOwner();
    }

    public function getTargetId(): Uuid
    {
        return $this->collection->getId();
    }
}
