<?php

namespace App\Entity\Inventory;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Entity\Identity\Profile;
use App\Entity\Place\Room;
use App\Entity\Reference\ItemCategory;
use App\Repository\Inventory\ItemRepository;
use App\State\SoftDeleteProcessor;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

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
#[ApiResource(
    shortName: 'Item',
    operations: [
        new GetCollection(),
        new Get(security: "is_granted('VIEW', object)"),
        new Post(denormalizationContext: ['groups' => ['possession:write', 'possession:create', 'item:write']], securityPostDenormalize: "is_granted('ITEM_CREATE') and is_granted('EDIT', object.getRoom())"),
        new Patch(denormalizationContext: ['groups' => ['possession:write', 'item:write']], security: "is_granted('EDIT', object)"),
        new Delete(security: "is_granted('EDIT', object)", processor: SoftDeleteProcessor::class),
    ],
    normalizationContext: ['groups' => ['possession:read', 'item:read']],
)]
class Item extends AbstractPossession
{
    #[ORM\ManyToOne(targetEntity: ItemCategory::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'RESTRICT')]
    #[Groups(['item:read', 'item:write'])]
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

    /**
     * Les photos de l'objet, à lire par GET /api/media/{id} (avec le jeton) :
     * la principale d'abord, puis dans l'ordre de la galerie.
     *
     * @return list<string>
     */
    public function getPhotos(): array
    {
        $links = $this->gallery->toArray();
        usort($links, static fn (ItemMedia $a, ItemMedia $b) => [$b->isPrimary(), $a->getPosition()] <=> [$a->isPrimary(), $b->getPosition()]);

        return array_map(static fn (ItemMedia $link) => '/api/media/'.$link->getMedia()->getId(), $links);
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
