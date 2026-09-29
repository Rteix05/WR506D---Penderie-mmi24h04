<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use Doctrine\ORM\Mapping as ORM;

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

    public function __construct(Profile $owner, Collection $collection, ShareAudience $audience, AccessLevel $accessLevel = AccessLevel::View)
    {
        parent::__construct($owner, $audience, $accessLevel);
        $this->collection = $collection;
        $this->assertOwnsTarget();
    }

    public function getCollection(): Collection
    {
        return $this->collection;
    }

    public function getTargetOwner(): Profile
    {
        return $this->collection->getOwner();
    }
}
