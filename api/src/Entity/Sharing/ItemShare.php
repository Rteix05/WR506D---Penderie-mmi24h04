<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Item;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

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

    /**
     * @param Share|null $grant pour un repartage par une personne autorisée à modifier
     */
    public function __construct(Profile $sharedBy, Item $item, ShareAudience $audience, AccessLevel $accessLevel = AccessLevel::Read, ?Share $grant = null)
    {
        // La cible d'abord : le constructeur parent en déduit le propriétaire.
        $this->item = $item;
        parent::__construct($sharedBy, $audience, $accessLevel, $grant);
    }

    public function getItem(): Item
    {
        return $this->item;
    }

    public function getTargetOwner(): Profile
    {
        return $this->item->getOwner();
    }

    public function getTargetId(): Uuid
    {
        return $this->item->getId();
    }

    protected function isTargetPersonal(): bool
    {
        return $this->item->isPersonal();
    }
}
