<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use App\Entity\Place\Box;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use Doctrine\ORM\Mapping as ORM;

/**
 * Partage d'une ressource précise : un conteneur et tout ce qu'il contient.
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

    public function __construct(Profile $owner, Box $box, ShareAudience $audience, AccessLevel $accessLevel = AccessLevel::View)
    {
        parent::__construct($owner, $audience, $accessLevel);
        $this->box = $box;
        $this->assertOwnsTarget();
    }

    public function getBox(): Box
    {
        return $this->box;
    }

    public function getTargetOwner(): Profile
    {
        return $this->box->getRoom()->getPlace()->getOwner();
    }
}
