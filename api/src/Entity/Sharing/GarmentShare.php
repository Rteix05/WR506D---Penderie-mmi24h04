<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

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

    /**
     * @param Share|null $grant pour un repartage par une personne autorisée à modifier
     */
    public function __construct(Profile $sharedBy, Garment $garment, ShareAudience $audience, AccessLevel $accessLevel = AccessLevel::Read, ?Share $grant = null)
    {
        // La cible d'abord : le constructeur parent en déduit le propriétaire.
        $this->garment = $garment;
        parent::__construct($sharedBy, $audience, $accessLevel, $grant);
    }

    public function getGarment(): Garment
    {
        return $this->garment;
    }

    public function getTargetOwner(): Profile
    {
        return $this->garment->getOwner();
    }

    public function getTargetId(): Uuid
    {
        return $this->garment->getId();
    }

    protected function isTargetPersonal(): bool
    {
        return $this->garment->isPersonal();
    }
}
