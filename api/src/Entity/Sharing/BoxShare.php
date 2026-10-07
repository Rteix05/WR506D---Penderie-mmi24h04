<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use App\Entity\Place\Box;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Partage d'une ressource précise : un conteneur et ce qu'il contient (sauf les objets personnels).
 *
 * CASCADE : si la cible disparaît réellement, son partage n'a plus
 * d'objet. Une cible supprimée en douceur garde son partage.
 */
#[ORM\Entity]
class BoxShare extends Share
{
    #[ORM\ManyToOne(targetEntity: Box::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private Box $box;

    /**
     * @param Share|null $grant pour un repartage par une personne autorisée à modifier
     */
    public function __construct(Profile $sharedBy, Box $box, ShareAudience $audience, AccessLevel $accessLevel = AccessLevel::Read, ?Share $grant = null)
    {
        // La cible d'abord : le constructeur parent en déduit le propriétaire.
        $this->box = $box;
        parent::__construct($sharedBy, $audience, $accessLevel, $grant);
    }

    public function getBox(): Box
    {
        return $this->box;
    }

    public function getTargetOwner(): Profile
    {
        return $this->box->getOwner();
    }

    public function getTargetId(): Uuid
    {
        return $this->box->getId();
    }
}
