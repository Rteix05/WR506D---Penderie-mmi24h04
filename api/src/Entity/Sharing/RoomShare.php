<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use App\Entity\Place\Room;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Partage d'une ressource précise : une pièce et ce qu'elle contient (sauf les objets personnels).
 *
 * CASCADE : si la cible disparaît réellement, son partage n'a plus
 * d'objet. Une cible supprimée en douceur garde son partage.
 */
#[ORM\Entity]
class RoomShare extends Share
{
    #[ORM\ManyToOne(targetEntity: Room::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private Room $room;

    /**
     * @param Share|null $grant pour un repartage par une personne autorisée à modifier
     */
    public function __construct(Profile $sharedBy, Room $room, ShareAudience $audience, AccessLevel $accessLevel = AccessLevel::Read, ?Share $grant = null)
    {
        // La cible d'abord : le constructeur parent en déduit le propriétaire.
        $this->room = $room;
        parent::__construct($sharedBy, $audience, $accessLevel, $grant);
    }

    public function getRoom(): Room
    {
        return $this->room;
    }

    public function getTargetOwner(): Profile
    {
        return $this->room->getPlace()->getOwner();
    }

    public function getTargetId(): Uuid
    {
        return $this->room->getId();
    }
}
