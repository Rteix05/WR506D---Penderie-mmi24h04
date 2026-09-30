<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use App\Entity\Place\Place;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Partage d'une ressource précise : un logement entier : ses pièces et leur contenu (sauf les objets personnels).
 *
 * CASCADE : si la cible disparaît réellement, son partage n'a plus
 * d'objet. Une cible supprimée en douceur garde son partage.
 */
#[ORM\Entity]
class PlaceShare extends Share
{
    #[ORM\ManyToOne(targetEntity: Place::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private Place $place;

    /**
     * @param Share|null $grant pour un repartage par une personne autorisée à modifier
     */
    public function __construct(Profile $sharedBy, Place $place, ShareAudience $audience, AccessLevel $accessLevel = AccessLevel::Read, ?Share $grant = null)
    {
        // La cible d'abord : le constructeur parent en déduit le propriétaire.
        $this->place = $place;
        parent::__construct($sharedBy, $audience, $accessLevel, $grant);
    }

    public function getPlace(): Place
    {
        return $this->place;
    }

    public function getTargetOwner(): Profile
    {
        return $this->place->getOwner();
    }

    public function getTargetId(): Uuid
    {
        return $this->place->getId();
    }
}
