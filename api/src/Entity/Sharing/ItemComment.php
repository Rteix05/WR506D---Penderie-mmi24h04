<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Item;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Un commentaire sur un objet. CASCADE : si la cible disparaît réellement,
 * ses commentaires aussi (une cible supprimée en douceur les garde).
 */
#[ORM\Entity]
class ItemComment extends Comment
{
    #[ORM\ManyToOne(targetEntity: Item::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private Item $item;

    public function __construct(Profile $author, Item $item, string $body, ?Share $share = null, ?Comment $parent = null)
    {
        parent::__construct($author, $body, $share, $parent);
        $this->item = $item;
        $this->assertReplyOnSameTarget();
    }

    public function getItem(): Item
    {
        return $this->item;
    }

    public function getTargetId(): Uuid
    {
        return $this->item->getId();
    }
}
