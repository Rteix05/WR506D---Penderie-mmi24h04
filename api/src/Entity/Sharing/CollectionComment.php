<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Un commentaire sur une collection. CASCADE : si la cible disparaît réellement,
 * ses commentaires aussi (une cible supprimée en douceur les garde).
 */
#[ORM\Entity]
class CollectionComment extends Comment
{
    #[ORM\ManyToOne(targetEntity: Collection::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private Collection $collection;

    public function __construct(Profile $author, Collection $collection, string $body, ?Share $share = null, ?Comment $parent = null)
    {
        parent::__construct($author, $body, $share, $parent);
        $this->collection = $collection;
        $this->assertReplyOnSameTarget();
    }

    public function getCollection(): Collection
    {
        return $this->collection;
    }

    public function getTargetId(): Uuid
    {
        return $this->collection->getId();
    }
}
