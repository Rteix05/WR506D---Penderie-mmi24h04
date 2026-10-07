<?php

namespace App\Entity\Inventory;

use App\Entity\Media\Media;
use App\Repository\Inventory\ItemMediaRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Une photo de la galerie d'un objet. Clé primaire composite (objet,
 * média) : la même photo n'apparaît qu'une fois dans une galerie.
 */
#[ORM\Entity(repositoryClass: ItemMediaRepository::class)]
#[ORM\Index(name: 'idx_item_media_order', columns: ['item_id', 'position'])]
#[ORM\UniqueConstraint(name: 'uniq_item_media_primary', columns: ['item_id'], options: ['where' => '(is_primary = true)'])]
class ItemMedia
{
    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Item::class, inversedBy: 'gallery')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Item $item;

    /** RESTRICT : un fichier encore affiché ne se supprime pas (MDD). */
    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Media::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Media $media;

    #[ORM\Column]
    private int $position;

    /** La photo de couverture : une seule par objet (index unique partiel). */
    #[ORM\Column]
    private bool $isPrimary;

    public function __construct(Item $item, Media $media, int $position = 0, bool $isPrimary = false)
    {
        $this->item = $item;
        $this->media = $media;
        $this->position = $position;
        $this->isPrimary = $isPrimary;
        $item->attachMedia($this);
    }

    public function getItem(): Item
    {
        return $this->item;
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
