<?php

namespace App\Entity\Inventory;

use App\Entity\Media\Media;
use App\Repository\Inventory\GarmentMediaRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Une photo de la galerie d'un vêtement. Même forme que ItemMedia.
 */
#[ORM\Entity(repositoryClass: GarmentMediaRepository::class)]
#[ORM\Index(name: 'idx_garment_media_order', columns: ['garment_id', 'position'])]
#[ORM\UniqueConstraint(name: 'uniq_garment_media_primary', columns: ['garment_id'], options: ['where' => '(is_primary = true)'])]
class GarmentMedia
{
    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Garment::class, inversedBy: 'gallery')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Garment $garment;

    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Media::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Media $media;

    #[ORM\Column]
    private int $position;

    #[ORM\Column]
    private bool $isPrimary;

    public function __construct(Garment $garment, Media $media, int $position = 0, bool $isPrimary = false)
    {
        $this->garment = $garment;
        $this->media = $media;
        $this->position = $position;
        $this->isPrimary = $isPrimary;
        $garment->attachMedia($this);
    }

    public function getGarment(): Garment
    {
        return $this->garment;
    }

    public function getMedia(): Media
    {
        return $this->media;
    }

    public function getPosition(): int
    {
        return $this->position;
    }

    public function setPosition(int $position): static
    {
        $this->position = $position;

        return $this;
    }

    public function isPrimary(): bool
    {
        return $this->isPrimary;
    }

    public function setIsPrimary(bool $isPrimary): static
    {
        $this->isPrimary = $isPrimary;

        return $this;
    }
}
