<?php

namespace App\Entity\Reference;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Reference\SizeSystemCode;
use App\Repository\Reference\SizeSystemRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

/**
 * Une échelle de mesure, identifiée par son code. Chargée par
 * app:reference-data:load, jamais créée par un utilisateur.
 */
#[ORM\Entity(repositoryClass: SizeSystemRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    shortName: 'SizeSystem',
    operations: [
        new GetCollection(),
        new Get(),
    ],
    normalizationContext: ['groups' => ['sizesystem:read']],
)]
class SizeSystem
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[Groups(['sizesystem:read'])]
    private Uuid $id;

    #[ORM\Column(length: 20, unique: true, enumType: SizeSystemCode::class)]
    #[Groups(['sizesystem:read'])]
    private SizeSystemCode $code;

    #[ORM\Column(length: 80)]
    #[Groups(['sizesystem:read'])]
    private string $name;

    /** « cm » pour un tour de cou ou une ceinture, nul pour une taille abstraite. */
    #[ORM\Column(length: 10, nullable: true)]
    #[Groups(['sizesystem:read'])]
    private ?string $unit = null;

    /**
     * Le vêtement peut-il saisir une taille hors échelle (Garment.sizeLabel) ?
     * Utile pour une pointure US ou une taille propre à une marque.
     */
    #[ORM\Column]
    #[Groups(['sizesystem:read'])]
    private bool $allowsFreeText = false;

    /** @var Collection<int, SizeValue> */
    #[ORM\OneToMany(targetEntity: SizeValue::class, mappedBy: 'sizeSystem')]
    #[ORM\OrderBy(['sortOrder' => 'ASC'])]
    #[Groups(['sizesystem:read'])]
    private Collection $values;

    public function __construct(SizeSystemCode $code, string $name)
    {
        $this->id = Uuid::v7();
        $this->code = $code;
        $this->name = $name;
        $this->values = new ArrayCollection();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getCode(): SizeSystemCode
    {
        return $this->code;
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

    public function getUnit(): ?string
    {
        return $this->unit;
    }

    public function setUnit(?string $unit): static
    {
        $this->unit = $unit;

        return $this;
    }

    public function allowsFreeText(): bool
    {
        return $this->allowsFreeText;
    }

    public function setAllowsFreeText(bool $allowsFreeText): static
    {
        $this->allowsFreeText = $allowsFreeText;

        return $this;
    }

    /** @return Collection<int, SizeValue> */
    public function getValues(): Collection
    {
        return $this->values;
    }

    /** @internal Côté inverse, tenu à jour par SizeValue. */
    public function attachValue(SizeValue $value): void
    {
        if (!$this->values->contains($value)) {
            $this->values->add($value);
        }
    }
}
