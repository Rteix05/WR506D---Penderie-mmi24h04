<?php

namespace App\Entity\Inventory;

use App\Entity\Identity\Profile;
use App\Entity\Place\Room;
use App\Entity\Reference\ItemCategory;
use App\Repository\Inventory\ItemRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

/**
 * L'objet possédé : perceuse, lampe, console…
 *
 * Index de recherche (pg_trgm, plein texte) posés par la migration : ce
 * sont des index sur expression, que Doctrine ne sait pas déclarer.
 */
#[ORM\Entity(repositoryClass: ItemRepository::class)]
#[ORM\Index(name: 'idx_item_owner_availability', columns: ['owner_id', 'availability'])]
#[ORM\Index(name: 'idx_item_room', columns: ['room_id'])]
#[ORM\Index(name: 'idx_item_box', columns: ['box_id'])]
class Item extends AbstractPossession
{
    #[ORM\ManyToOne(targetEntity: ItemCategory::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'RESTRICT')]
    private ?ItemCategory $category = null;

    /** @var Collection<int, ItemMedia> */
    #[ORM\OneToMany(targetEntity: ItemMedia::class, mappedBy: 'item')]
    #[ORM\OrderBy(['position' => 'ASC'])]
    private Collection $gallery;

    public function __construct(Profile $owner, string $name, Room $room, ?ItemCategory $category = null)
    {
        parent::__construct($owner, $name, $room);
        $this->category = $category;
        $this->gallery = new ArrayCollection();
    }

    public function getCategory(): ?ItemCategory
    {
        return $this->category;
    }

    public function setCategory(?ItemCategory $category): static
    {
        $this->category = $category;

        return $this;
    }

    /** @return Collection<int, ItemMedia> */
    public function getGallery(): Collection
    {
        return $this->gallery;
    }

    /** @internal Côté inverse, tenu à jour par ItemMedia. */
    public function attachMedia(ItemMedia $link): void
    {
        if (!$this->gallery->contains($link)) {
            $this->gallery->add($link);
        }
    }
}
