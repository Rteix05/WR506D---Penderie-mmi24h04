<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use App\Entity\Place\Room;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use Doctrine\ORM\Mapping as ORM;

/**
 * Partage d'une ressource précise : une pièce et tout ce qu'elle contient.
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

    public function __construct(Profile $owner, Room $room, ShareAudience $audience, AccessLevel $accessLevel = AccessLevel::View)
    {
        parent::__construct($owner, $audience, $accessLevel);
        $this->room = $room;
        $this->assertOwnsTarget();
    }

    public function getRoom(): Room
    {
        return $this->room;
    }

    public function getTargetOwner(): Profile
    {
        return $this->room->getPlace()->getOwner();
    }
}
