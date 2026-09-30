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
use App\Entity\Reference\Brand;
use App\Entity\Reference\Color;
use App\Entity\Reference\GarmentCategory;
use App\Entity\Reference\SizeValue;
use App\Entity\Reference\Style;
use App\Enum\Inventory\GarmentUsage;
use App\Enum\Reference\Warmth;
use App\Repository\Inventory\GarmentRepository;
use App\State\SoftDeleteProcessor;
use App\Validator\Inventory\ValidGarmentSize;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Le vêtement : mêmes mécanismes de rangement, de prêt et de vente qu'un
 * objet, plus ce qu'il faut pour habiller quelqu'un (taille, chaleur,
 * usage, couleurs, styles).
 *
 * La catégorie est obligatoire : c'est elle qui déclare l'échelle de
 * tailles et la chaleur par défaut.
 */
#[ORM\Entity(repositoryClass: GarmentRepository::class)]
#[ORM\Index(name: 'idx_garment_owner_category_size', columns: ['owner_id', 'category_id', 'size_id'])]
#[ORM\Index(name: 'idx_garment_owner_availability', columns: ['owner_id', 'availability'])]
#[ORM\Index(name: 'idx_garment_room', columns: ['room_id'])]
#[ORM\Index(name: 'idx_garment_box', columns: ['box_id'])]
#[ValidGarmentSize]
#[ApiResource(
    shortName: 'Garment',
    operations: [
        new GetCollection(),
        new Get(security: "is_granted('VIEW', object)"),
        new Post(denormalizationContext: ['groups' => ['possession:write', 'possession:create', 'garment:write', 'garment:create']], securityPostDenormalize: "is_granted('GARMENT_MANAGE') and is_granted('EDIT', object.getRoom())"),
        new Patch(denormalizationContext: ['groups' => ['possession:write', 'garment:write']], security: "is_granted('EDIT', object)"),
        new Delete(security: "is_granted('EDIT', object)", processor: SoftDeleteProcessor::class),
    ],
    normalizationContext: ['groups' => ['possession:read', 'garment:read']],
)]
class Garment extends AbstractPossession
{
    #[ORM\ManyToOne(targetEntity: GarmentCategory::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    #[Groups(['garment:read', 'garment:create'])]
    private GarmentCategory $category;

    /** RESTRICT : une marque utilisée se fusionne, elle ne se supprime pas. */
    #[ORM\ManyToOne(targetEntity: Brand::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'RESTRICT')]
    #[Groups(['garment:read', 'garment:write'])]
    private ?Brand $brand = null;

    /** Une graduation de l'échelle de la catégorie (ValidGarmentSize). */
    #[ORM\ManyToOne(targetEntity: SizeValue::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'RESTRICT')]
    #[Groups(['garment:read', 'garment:write'])]
    private ?SizeValue $size = null;

    /** Repli texte libre, si l'échelle de la catégorie l'autorise. */
    #[ORM\Column(length: 20, nullable: true)]
    #[Assert\Length(max: 20)]
    #[Groups(['garment:read', 'garment:write'])]
    private ?string $sizeLabel = null;

    #[ORM\Column(length: 20, enumType: GarmentUsage::class)]
    #[Groups(['garment:read', 'garment:write'])]
    private GarmentUsage $usage = GarmentUsage::Everyday;

    /** Nul = hérite de la catégorie (getEffectiveWarmth). */
    #[ORM\Column(length: 20, nullable: true, enumType: Warmth::class)]
    #[Groups(['garment:read', 'garment:write'])]
    private ?Warmth $warmth = null;

    #[ORM\Column]
    #[Groups(['garment:read', 'garment:write'])]
    private bool $waterResistant = false;

    /** @var Collection<int, Color> */
    #[ORM\ManyToMany(targetEntity: Color::class)]
    #[ORM\JoinTable(name: 'garment_color')]
    #[ORM\JoinColumn(name: 'garment_id', onDelete: 'CASCADE')]
    #[ORM\InverseJoinColumn(name: 'color_id', onDelete: 'RESTRICT')]
    #[Groups(['garment:read', 'garment:write'])]
    private Collection $colors;

    /** @var Collection<int, Style> */
    #[ORM\ManyToMany(targetEntity: Style::class)]
    #[ORM\JoinTable(name: 'garment_style')]
    #[ORM\JoinColumn(name: 'garment_id', onDelete: 'CASCADE')]
    #[ORM\InverseJoinColumn(name: 'style_id', onDelete: 'RESTRICT')]
    #[Groups(['garment:read', 'garment:write'])]
    private Collection $styles;

    /** @var Collection<int, GarmentMedia> */
    #[ORM\OneToMany(targetEntity: GarmentMedia::class, mappedBy: 'garment')]
    #[ORM\OrderBy(['position' => 'ASC'])]
    private Collection $gallery;

    public function __construct(Profile $owner, string $name, Room $room, GarmentCategory $category)
    {
        parent::__construct($owner, $name, $room);
        $this->category = $category;
        $this->colors = new ArrayCollection();
        $this->styles = new ArrayCollection();
        $this->gallery = new ArrayCollection();
    }

    public function getCategory(): GarmentCategory
    {
        return $this->category;
    }

    /** Changer de catégorie peut changer d'échelle : la taille est alors revalidée. */
    public function setCategory(GarmentCategory $category): static
    {
        $this->category = $category;

        return $this;
    }

    public function getBrand(): ?Brand
    {
        return $this->brand;
    }

    public function setBrand(?Brand $brand): static
    {
        $this->brand = $brand;

        return $this;
    }

    public function getSize(): ?SizeValue
    {
        return $this->size;
    }

    public function getSizeLabel(): ?string
    {
        return $this->sizeLabel;
    }

    /** Une graduation de l'échelle, ou à défaut un texte libre : jamais les deux. */
    public function setSize(?SizeValue $size): static
    {
        $this->size = $size;
        if (null !== $size) {
            $this->sizeLabel = null;
        }

        return $this;
    }

    public function setSizeLabel(?string $sizeLabel): static
    {
        $this->sizeLabel = null === $sizeLabel ? null : trim($sizeLabel);
        if (null !== $sizeLabel) {
            $this->size = null;
        }

        return $this;
    }

    /** Ce que l'interface affiche : « M », « W32 L34 », « 39-42 »… */
    public function getDisplayedSize(): ?string
    {
        return $this->size?->getLabel() ?? $this->sizeLabel;
    }

    public function getUsage(): GarmentUsage
    {
        return $this->usage;
    }

    public function setUsage(GarmentUsage $usage): static
    {
        $this->usage = $usage;

        return $this;
    }

    public function getWarmth(): ?Warmth
    {
        return $this->warmth;
    }

    public function setWarmth(?Warmth $warmth): static
    {
        $this->warmth = $warmth;

        return $this;
    }

    /** La chaleur propre, sinon celle de la catégorie : ce que lit la suggestion. */
    public function getEffectiveWarmth(): ?Warmth
    {
        return $this->warmth ?? $this->category->getDefaultWarmth();
    }

    public function isWaterResistant(): bool
    {
        return $this->waterResistant;
    }

    public function setWaterResistant(bool $waterResistant): static
    {
        $this->waterResistant = $waterResistant;

        return $this;
    }

    /** @return Collection<int, Color> */
    public function getColors(): Collection
    {
        return $this->colors;
    }

    public function addColor(Color $color): static
    {
        if (!$this->colors->contains($color)) {
            $this->colors->add($color);
        }

        return $this;
    }

    public function removeColor(Color $color): static
    {
        $this->colors->removeElement($color);

        return $this;
    }

    /** @return Collection<int, Style> */
    public function getStyles(): Collection
    {
        return $this->styles;
    }

    public function addStyle(Style $style): static
    {
        if (!$this->styles->contains($style)) {
            $this->styles->add($style);
        }

        return $this;
    }

    public function removeStyle(Style $style): static
    {
        $this->styles->removeElement($style);

        return $this;
    }

    /** @return Collection<int, GarmentMedia> */
    public function getGallery(): Collection
    {
        return $this->gallery;
    }

    /** @internal Côté inverse, tenu à jour par GarmentMedia. */
    public function attachMedia(GarmentMedia $link): void
    {
        if (!$this->gallery->contains($link)) {
            $this->gallery->add($link);
        }
    }
}
