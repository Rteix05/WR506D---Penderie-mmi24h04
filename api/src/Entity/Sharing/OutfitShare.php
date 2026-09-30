<?php

namespace App\Entity\Sharing;

use App\Entity\Dressing\Outfit;
use App\Entity\Identity\Profile;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Partage d'une ressource précise : un look (une tenue).
 *
 * CASCADE : si la cible disparaît réellement, son partage n'a plus
 * d'objet. Une cible supprimée en douceur garde son partage.
 */
#[ORM\Entity]
class OutfitShare extends Share
{
    #[ORM\ManyToOne(targetEntity: Outfit::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private Outfit $outfit;

    /**
     * @param Share|null $grant pour un repartage par une personne autorisée à modifier
     */
    public function __construct(Profile $sharedBy, Outfit $outfit, ShareAudience $audience, AccessLevel $accessLevel = AccessLevel::Read, ?Share $grant = null)
    {
        // La cible d'abord : le constructeur parent en déduit le propriétaire.
        $this->outfit = $outfit;
        parent::__construct($sharedBy, $audience, $accessLevel, $grant);
    }

    public function getOutfit(): Outfit
    {
        return $this->outfit;
    }

    public function getTargetOwner(): Profile
    {
        return $this->outfit->getOwner();
    }

    public function getTargetId(): Uuid
    {
        return $this->outfit->getId();
    }
}
