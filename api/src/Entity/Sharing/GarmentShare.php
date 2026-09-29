<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use Doctrine\ORM\Mapping as ORM;

/**
 * Partage d'une ressource précise : un vêtement.
 *
 * CASCADE : si la cible disparaît réellement, son partage n'a plus
 * d'objet. Une cible supprimée en douceur garde son partage.
 */
#[ORM\Entity]
class GarmentShare extends Share
{
    #[ORM\ManyToOne(targetEntity: Garment::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private Garment $garment;

    public function __construct(Profile $owner, Garment $garment, ShareAudience $audience, AccessLevel $accessLevel = AccessLevel::View)
    {
        parent::__construct($owner, $audience, $accessLevel);
        $this->garment = $garment;
        $this->assertOwnsTarget();
    }

    public function getGarment(): Garment
    {
        return $this->garment;
    }

    public function getTargetOwner(): Profile
    {
        return $this->garment->getOwner();
    }
}
