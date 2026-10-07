<?php

namespace App\Entity\Sale;

use App\Entity\Media\Media;
use App\Repository\Sale\ListingMediaRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Une photo d'annonce. Clé primaire composite (annonce, média) : la même
 * photo peut servir à l'objet et à son annonce sans être dupliquée.
 */
#[ORM\Entity(repositoryClass: ListingMediaRepository::class)]
#[ORM\Index(name: 'idx_listing_media_order', columns: ['listing_id', 'position'])]
class ListingMedia
{
    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Listing::class, inversedBy: 'gallery')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Listing $listing;

    /** RESTRICT : un fichier encore affiché sur une annonce ne se supprime pas (MDD). */
    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Media::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Media $media;

    #[ORM\Column]
    private int $position;

    public function __construct(Listing $listing, Media $media, int $position = 0)
    {
        $this->listing = $listing;
        $this->media = $media;
        $this->position = $position;
        $listing->attachMedia($this);
    }

    public function getListing(): Listing
    {
        return $this->listing;
    }

    public function getMedia(): Media
    {
        return $this->media;
    }

    public function getPosition(): int
    {
        return $this->position;
    }
}
