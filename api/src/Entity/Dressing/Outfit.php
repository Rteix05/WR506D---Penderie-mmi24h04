<?php

namespace App\Entity\Dressing;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Dressing\OutfitSource;
use App\Enum\Dressing\Season;
use App\Enum\Inventory\GarmentUsage;
use App\Repository\Dressing\OutfitRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Une tenue assumée par l'utilisateur : composée de zéro, ou acceptée
 * depuis une suggestion (OutfitSuggestion::accept).
 *
 * L'occasion reprend l'énumération de l'usage d'un vêtement
 * (GarmentUsage) : mêmes valeurs, une seule source.
 */
#[ORM\Entity(repositoryClass: OutfitRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_outfit_owner', columns: ['owner_id'])]
class Outfit
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

    #[ORM\Column(length: 20, enumType: GarmentUsage::class)]
    private GarmentUsage $occasion;

    #[ORM\Column(length: 20, nullable: true, enumType: Season::class)]
    private ?Season $season = null;

    #[ORM\Column(length: 20, enumType: OutfitSource::class)]
    private OutfitSource $source = OutfitSource::Manual;

    /** La suggestion acceptée : une tenue au plus par suggestion. */
    #[ORM\OneToOne(targetEntity: OutfitSuggestion::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?OutfitSuggestion $fromSuggestion = null;

    /** @var Collection<int, OutfitGarment> */
    #[ORM\OneToMany(targetEntity: OutfitGarment::class, mappedBy: 'outfit', cascade: ['persist'], orphanRemoval: true)]
    #[ORM\OrderBy(['position' => 'ASC'])]
    private Collection $pieces;

    public function __construct(Profile $owner, string $name, GarmentUsage $occasion = GarmentUsage::Everyday)
    {
        $this->id = Uuid::v7();
        $this->owner = $owner;
        $this->name = $name;
        $this->occasion = $occasion;
        $this->pieces = new ArrayCollection();
    }

    /** @internal Par OutfitSuggestion::accept(). */
    public static function fromSuggestion(OutfitSuggestion $suggestion, string $name): self
    {
        $outfit = new self($suggestion->getProfile(), $name, $suggestion->getOccasion());
        $outfit->source = OutfitSource::FromSuggestion;
        $outfit->fromSuggestion = $suggestion;
        foreach ($suggestion->getKeptGarments() as $garment) {
            $outfit->addGarment($garment);
        }

        return $outfit;
    }

    public function addGarment(Garment $garment): static
    {
        foreach ($this->pieces as $piece) {
            if ($piece->getGarment() === $garment) {
                return $this;
            }
        }
        $this->pieces->add(new OutfitGarment($this, $garment, $this->pieces->count()));

        return $this;
    }

    public function removeGarment(Garment $garment): static
    {
        foreach ($this->pieces as $piece) {
            if ($piece->getGarment() === $garment) {
                $this->pieces->removeElement($piece);
            }
        }

        return $this;
    }

    /**
     * Porter la tenue : une ligne WearLog par pièce, au nom de celui qui la
     * porte (pas forcément le propriétaire, dans un dressing familial).
     *
     * @return list<WearLog> à persister
     */
    public function wear(Profile $wearer, ?\DateTimeImmutable $on = null): array
    {
        $logs = [];
        foreach ($this->pieces as $piece) {
            $logs[] = new WearLog($piece->getGarment(), $wearer, $on, $this);
        }

        return $logs;
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

    public function getOccasion(): GarmentUsage
    {
        return $this->occasion;
    }

    public function setOccasion(GarmentUsage $occasion): static
    {
        $this->occasion = $occasion;

        return $this;
    }

    public function getSeason(): ?Season
    {
        return $this->season;
    }

    public function setSeason(?Season $season): static
    {
        $this->season = $season;

        return $this;
    }

    public function getSource(): OutfitSource
    {
        return $this->source;
    }

    public function getFromSuggestion(): ?OutfitSuggestion
    {
        return $this->fromSuggestion;
    }

    /** @return list<Garment> dans l'ordre */
    public function getGarments(): array
    {
        return array_values(array_map(static fn (OutfitGarment $p) => $p->getGarment(), $this->pieces->toArray()));
    }

    /** @return Collection<int, OutfitGarment> */
    public function getPieces(): Collection
    {
        return $this->pieces;
    }
}
