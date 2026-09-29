<?php

namespace App\Entity\Inventory;

use App\Entity\Identity\Profile;
use App\Entity\Media\Media;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Inventory\ScanKind;
use App\Enum\Inventory\ScanStatus;
use App\Repository\Inventory\ScanRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * La trace d'un scan, réussi ou non, gardée pour mesurer la fiabilité
 * (critère de validation de la fonctionnalité).
 *
 * La technologie est imposée par le module et pas encore connue :
 * provider et rawData existent pour ne pas la figer dans le schéma.
 */
#[ORM\Entity(repositoryClass: ScanRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_scan_profile_created', columns: ['profile_id', 'created_at'])]
#[ORM\Index(name: 'idx_scan_kind_status', columns: ['kind', 'status'])]
class Scan
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    /** CASCADE : une trace de scan n'intéresse que son auteur. */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $profile;

    /**
     * L'image scannée. Facultative (écart assumé avec le MDD) : un code-barres
     * lu en direct par la caméra ne laisse pas forcément d'image.
     */
    #[ORM\ManyToOne(targetEntity: Media::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Media $media;

    #[ORM\Column(length: 20, enumType: ScanKind::class)]
    private ScanKind $kind;

    /** La valeur lue : EAN, contenu du QR code. */
    #[ORM\Column(length: 255, nullable: true)]
    private ?string $code = null;

    #[ORM\Column(length: 20, enumType: ScanStatus::class)]
    private ScanStatus $status;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $provider = null;

    /** @var array<string, mixed>|null la réponse brute du prestataire */
    #[ORM\Column(type: Types::JSON, nullable: true, options: ['jsonb' => true])]
    private ?array $rawData = null;

    /** L'objet créé à partir du scan, s'il y en a un. Au plus un des deux. */
    #[ORM\ManyToOne(targetEntity: Item::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Item $resultingItem = null;

    #[ORM\ManyToOne(targetEntity: Garment::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Garment $resultingGarment = null;

    /** @param array<string, mixed>|null $rawData */
    public function __construct(
        Profile $profile,
        ScanKind $kind,
        ScanStatus $status,
        ?string $code = null,
        ?Media $media = null,
        ?string $provider = null,
        ?array $rawData = null,
    ) {
        $this->id = Uuid::v7();
        $this->profile = $profile;
        $this->kind = $kind;
        $this->status = $status;
        $this->code = $code;
        $this->media = $media;
        $this->provider = $provider;
        $this->rawData = $rawData;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getProfile(): Profile
    {
        return $this->profile;
    }

    public function getMedia(): ?Media
    {
        return $this->media;
    }

    public function getKind(): ScanKind
    {
        return $this->kind;
    }

    public function getCode(): ?string
    {
        return $this->code;
    }

    public function getStatus(): ScanStatus
    {
        return $this->status;
    }

    public function getProvider(): ?string
    {
        return $this->provider;
    }

    /** @return array<string, mixed>|null */
    public function getRawData(): ?array
    {
        return $this->rawData;
    }

    public function getResultingItem(): ?Item
    {
        return $this->resultingItem;
    }

    public function getResultingGarment(): ?Garment
    {
        return $this->resultingGarment;
    }

    /** Relie le scan à ce qu'il a permis de créer. */
    public function resultedIn(Item|Garment $possession): static
    {
        if (ScanStatus::Failed === $this->status) {
            throw new \LogicException('Un scan échoué n\'a rien créé.');
        }
        $this->resultingItem = $possession instanceof Item ? $possession : null;
        $this->resultingGarment = $possession instanceof Garment ? $possession : null;

        return $this;
    }
}
