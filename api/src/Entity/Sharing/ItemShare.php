<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Item;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use Doctrine\ORM\Mapping as ORM;

/**
 * Partage d'une ressource précise : un objet.
 *
 * CASCADE : si la cible disparaît réellement, son partage n'a plus
 * d'objet. Une cible supprimée en douceur garde son partage.
 */
#[ORM\Entity]
class ItemShare extends Share
{
    #[ORM\ManyToOne(targetEntity: Item::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private Item $item;

    public function __construct(Profile $owner, Item $item, ShareAudience $audience, AccessLevel $accessLevel = AccessLevel::View)
    {
        parent::__construct($owner, $audience, $accessLevel);
        $this->item = $item;
        $this->assertOwnsTarget();
    }

    public function getItem(): Item
    {
        return $this->item;
    }

    public function getTargetOwner(): Profile
    {
        return $this->item->getOwner();
    }
}
