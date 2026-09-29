<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Un commentaire sur un vêtement. CASCADE : si la cible disparaît réellement,
 * ses commentaires aussi (une cible supprimée en douceur les garde).
 */
#[ORM\Entity]
class GarmentComment extends Comment
{
    #[ORM\ManyToOne(targetEntity: Garment::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private Garment $garment;

    public function __construct(Profile $author, Garment $garment, string $body, ?Share $share = null, ?Comment $parent = null)
    {
        parent::__construct($author, $body, $share, $parent);
        $this->garment = $garment;
        $this->assertReplyOnSameTarget();
    }

    public function getGarment(): Garment
    {
        return $this->garment;
    }

    public function getTargetId(): Uuid
    {
        return $this->garment->getId();
    }
}
