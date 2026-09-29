<?php

namespace App\Entity\Reference;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Trait\TimestampableTrait;
use App\Repository\Reference\StyleRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

/**
 * Un style vestimentaire (n,n avec Garment), cible possible d'une
 * préférence. Chargé par app:reference-data:load.
 */
#[ORM\Entity(repositoryClass: StyleRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    shortName: 'Style',
    operations: [
        new GetCollection(),
        new Get(),
    ],
    normalizationContext: ['groups' => ['style:read']],
)]
class Style
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[Groups(['style:read'])]
    private Uuid $id;

    #[ORM\Column(length: 40, unique: true)]
    #[Groups(['style:read'])]
    private string $slug;

    #[ORM\Column(length: 40)]
    #[Groups(['style:read'])]
    private string $name;

    public function __construct(string $slug, string $name)
    {
        $this->id = Uuid::v7();
        $this->slug = $slug;
        $this->name = $name;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getSlug(): string
    {
        return $this->slug;
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
}
