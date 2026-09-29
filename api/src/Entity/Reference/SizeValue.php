<?php

namespace App\Entity\Reference;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Trait\TimestampableTrait;
use App\Repository\Reference\SizeValueRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

/**
 * Une graduation d'une échelle : « 42 », « M », « W32 L34 », « 8 ans ».
 * C'est ce que le vêtement référence, jamais du texte libre.
 */
#[ORM\Entity(repositoryClass: SizeValueRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\UniqueConstraint(name: 'uniq_size_value_label', columns: ['size_system_id', 'label'])]
#[ORM\Index(name: 'idx_size_value_order', columns: ['size_system_id', 'sort_order'])]
#[ApiResource(
    shortName: 'SizeValue',
    operations: [
        new GetCollection(),
        new Get(),
    ],
    normalizationContext: ['groups' => ['sizevalue:read']],
)]
class SizeValue
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[Groups(['sizevalue:read'])]
    private Uuid $id;

    /**
     * CASCADE : une échelle emporte ses graduations. Les vêtements, eux,
     * bloqueront la suppression d'une graduation utilisée (RESTRICT).
     */
    #[ORM\ManyToOne(targetEntity: SizeSystem::class, inversedBy: 'values')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[Groups(['sizevalue:read'])]
    private SizeSystem $sizeSystem;

    #[ORM\Column(length: 20)]
    #[Groups(['sizevalue:read'])]
    private string $label;

    /** Pour trier M avant L, et « 2 ans » avant « 10 ans ». */
    #[ORM\Column]
    #[Groups(['sizevalue:read'])]
    private int $sortOrder;

    public function __construct(SizeSystem $sizeSystem, string $label, int $sortOrder)
    {
        $this->id = Uuid::v7();
        $this->sizeSystem = $sizeSystem;
        $this->label = $label;
        $this->sortOrder = $sortOrder;
        $sizeSystem->attachValue($this);
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getSizeSystem(): SizeSystem
    {
        return $this->sizeSystem;
    }

    public function getLabel(): string
    {
        return $this->label;
    }

    public function getSortOrder(): int
    {
        return $this->sortOrder;
    }

    public function setSortOrder(int $sortOrder): static
    {
        $this->sortOrder = $sortOrder;

        return $this;
    }
}
