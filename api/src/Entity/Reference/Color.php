<?php

namespace App\Entity\Reference;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Reference\ColorFamily;
use App\Repository\Reference\ColorRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

/**
 * Une couleur de vêtement (n,n avec Garment), cible possible d'une
 * préférence. Chargée par app:reference-data:load.
 */
#[ORM\Entity(repositoryClass: ColorRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_color_family', columns: ['family'])]
#[ApiResource(
    shortName: 'Color',
    operations: [
        new GetCollection(),
        new Get(),
    ],
    normalizationContext: ['groups' => ['color:read']],
)]
class Color
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[Groups(['color:read'])]
    private Uuid $id;

    #[ORM\Column(length: 40, unique: true)]
    #[Groups(['color:read'])]
    private string $name;

    /** « #1B2A4A ». Nul pour « Multicolore », qui n'a pas de teinte unique. */
    #[ORM\Column(length: 7, nullable: true)]
    #[Groups(['color:read'])]
    private ?string $hex;

    #[ORM\Column(length: 20, enumType: ColorFamily::class)]
    #[Groups(['color:read'])]
    private ColorFamily $family;

    public function __construct(string $name, ?string $hex, ColorFamily $family)
    {
        $this->id = Uuid::v7();
        $this->name = $name;
        $this->hex = $hex;
        $this->family = $family;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getHex(): ?string
    {
        return $this->hex;
    }

    public function getFamily(): ColorFamily
    {
        return $this->family;
    }

    public function update(?string $hex, ColorFamily $family): static
    {
        $this->hex = $hex;
        $this->family = $family;

        return $this;
    }
}
