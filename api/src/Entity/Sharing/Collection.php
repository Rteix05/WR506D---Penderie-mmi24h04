<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use App\Entity\Media\Media;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Sharing\CollectionLayout;
use App\Enum\Sharing\CollectionVisibility;
use App\Repository\Sharing\CollectionRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection as DoctrineCollection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Un regroupement libre, en liste ou en moodboard. Elle RÉFÉRENCE des
 * objets, elle ne les possède pas : la supprimer supprime ses entrées
 * (CASCADE) et rien d'autre.
 */
#[ORM\Entity(repositoryClass: CollectionRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_collection_owner', columns: ['owner_id'])]
class Collection
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    /** RESTRICT : transférée au tuteur à la suppression d'un profil enfant. */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Profile $owner;

    #[ORM\Column(length: 120)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 120)]
    private string $name;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Assert\Length(max: 2000)]
    private ?string $description = null;

    #[ORM\Column(length: 20, enumType: CollectionLayout::class)]
    private CollectionLayout $layout;

    #[ORM\Column(length: 20, enumType: CollectionVisibility::class)]
    private CollectionVisibility $visibility = CollectionVisibility::Private;

    #[ORM\ManyToOne(targetEntity: Media::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Media $coverMedia = null;

    /** Le fond du moodboard, « #F4EFE6 ». */
    #[ORM\Column(length: 7, nullable: true)]
    #[Assert\Regex('/^#[0-9A-F]{6}$/')]
    private ?string $backgroundColor = null;

    /** @var DoctrineCollection<int, CollectionEntry> */
    #[ORM\OneToMany(targetEntity: CollectionEntry::class, mappedBy: 'collection')]
    #[ORM\OrderBy(['position' => 'ASC'])]
    private DoctrineCollection $entries;

    public function __construct(Profile $owner, string $name, CollectionLayout $layout = CollectionLayout::List)
    {
        $this->id = Uuid::v7();
        $this->owner = $owner;
        $this->name = $name;
        $this->layout = $layout;
        $this->entries = new ArrayCollection();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getOwner(): Profile
    {
        return $this->owner;
    }

    public function transferTo(Profile $owner): static
    {
        $this->owner = $owner;

        return $this;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;

        return $this;
    }

    public function getLayout(): CollectionLayout
    {
        return $this->layout;
    }

    public function setLayout(CollectionLayout $layout): static
    {
        $this->layout = $layout;

        return $this;
    }

    public function getVisibility(): CollectionVisibility
    {
        return $this->visibility;
    }

    public function setVisibility(CollectionVisibility $visibility): static
    {
        $this->visibility = $visibility;

        return $this;
    }

    public function getCoverMedia(): ?Media
    {
        return $this->coverMedia;
    }

    public function setCoverMedia(?Media $coverMedia): static
    {
        $this->coverMedia = $coverMedia;

        return $this;
    }

    public function getBackgroundColor(): ?string
    {
        return $this->backgroundColor;
    }

    public function setBackgroundColor(?string $backgroundColor): static
    {
        $this->backgroundColor = null === $backgroundColor ? null : strtoupper($backgroundColor);

        return $this;
    }

    /** @return DoctrineCollection<int, CollectionEntry> */
    public function getEntries(): DoctrineCollection
    {
        return $this->entries;
    }

    /** @internal Côté inverse, tenu à jour par CollectionEntry. */
    public function attachEntry(CollectionEntry $entry): void
    {
        if (!$this->entries->contains($entry)) {
            $this->entries->add($entry);
        }
    }
}
