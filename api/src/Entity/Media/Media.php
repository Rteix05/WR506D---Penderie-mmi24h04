<?php

namespace App\Entity\Media;

use App\Entity\Identity\Profile;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Media\MediaKind;
use App\Repository\Media\MediaRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Un fichier stocké sur S3 (MinIO en dev), appartenant à un profil.
 *
 * Ressource autonome : la même photo peut servir à un objet et à son
 * annonce sans être dupliquée. Les galeries passent par des tables de
 * liaison (ItemMedia, GarmentMedia…), créées avec leur domaine ; les
 * vignettes uniques par une clé directe (Profile.avatarMedia, coverMedia).
 */
#[ORM\Entity(repositoryClass: MediaRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_media_owner_created', columns: ['owner_id', 'created_at'])]
class Media
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Profile $owner;

    /** La clé de l'objet dans le bucket S3, pas une URL. */
    #[ORM\Column(length: 255, unique: true)]
    #[Assert\NotBlank]
    private string $path;

    #[ORM\Column(length: 100)]
    #[Assert\NotBlank]
    private string $mimeType;

    #[ORM\Column(type: Types::INTEGER)]
    #[Assert\Positive]
    private int $sizeBytes;

    #[ORM\Column(nullable: true)]
    #[Assert\Positive]
    private ?int $width = null;

    #[ORM\Column(nullable: true)]
    #[Assert\Positive]
    private ?int $height = null;

    #[ORM\Column(length: 20, enumType: MediaKind::class)]
    private MediaKind $kind;

    /** Texte alternatif lu par le lecteur d'écran (RAAM). */
    #[ORM\Column(length: 255, nullable: true)]
    #[Assert\Length(max: 255)]
    private ?string $altText = null;

    public function __construct(Profile $owner, string $path, string $mimeType, int $sizeBytes, MediaKind $kind = MediaKind::Photo)
    {
        $this->id = Uuid::v7();
        $this->owner = $owner;
        $this->path = $path;
        $this->mimeType = $mimeType;
        $this->sizeBytes = $sizeBytes;
        $this->kind = $kind;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getOwner(): Profile
    {
        return $this->owner;
    }

    /** Transfert au tuteur à la suppression d'un profil enfant. */
    public function transferTo(Profile $owner): static
    {
        $this->owner = $owner;

        return $this;
    }

    public function getPath(): string
    {
        return $this->path;
    }

    public function getMimeType(): string
    {
        return $this->mimeType;
    }

    public function getSizeBytes(): int
    {
        return $this->sizeBytes;
    }

    public function getWidth(): ?int
    {
        return $this->width;
    }

    public function getHeight(): ?int
    {
        return $this->height;
    }

    public function setDimensions(?int $width, ?int $height): static
    {
        $this->width = $width;
        $this->height = $height;

        return $this;
    }

    public function getKind(): MediaKind
    {
        return $this->kind;
    }

    public function getAltText(): ?string
    {
        return $this->altText;
    }

    public function setAltText(?string $altText): static
    {
        $this->altText = $altText;

        return $this;
    }
}
