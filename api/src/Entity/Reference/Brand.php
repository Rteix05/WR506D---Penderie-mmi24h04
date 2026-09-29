<?php

namespace App\Entity\Reference;

use App\Entity\Identity\Profile;
use App\Entity\Media\Media;
use App\Entity\Trait\TimestampableTrait;
use App\Repository\Reference\BrandRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\String\UnicodeString;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Une marque de vêtement, « à la Vinted » (décisions du 29/09) :
 *  - une liste prédéfinie, chargée vérifiée par app:reference-data:load ;
 *  - l'utilisateur peut ajouter la sienne (collab, marque indépendante) :
 *    non vérifiée, visible de tous avec une pastille « Non vérifiée »,
 *    proposée dans l'autocomplétion à son seul créateur ;
 *  - l'admin la valide (elle rejoint la liste de tous), la renomme, la
 *    fusionne avec un doublon ou la supprime.
 *
 * Le slug (minuscules, sans accents, espaces ni ponctuation) est la clé
 * de dédoublonnage : « Zara », « ZARA » et « zara » sont la même marque.
 */
#[ORM\Entity(repositoryClass: BrandRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[UniqueEntity(fields: ['slug'], message: 'Cette marque existe déjà.')]
class Brand
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\Column(length: 80)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 80)]
    private string $name;

    #[ORM\Column(length: 80, unique: true)]
    #[Assert\NotBlank(message: 'Ce nom de marque ne contient aucune lettre ni aucun chiffre.')]
    private string $slug;

    #[ORM\ManyToOne(targetEntity: Media::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Media $logoMedia = null;

    #[ORM\Column]
    private bool $isVerified;

    /**
     * Nul pour une marque de la liste prédéfinie. SET NULL à la suppression
     * du profil : la marque survit, elle n'appartient à personne.
     */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Profile $createdBy;

    /** Une marque de la liste prédéfinie. */
    public static function reference(string $name): self
    {
        return new self($name, null);
    }

    /** Une marque saisie par un utilisateur, en attente de validation. */
    public static function proposedBy(string $name, Profile $profile): self
    {
        return new self($name, $profile);
    }

    private function __construct(string $name, ?Profile $createdBy)
    {
        $this->id = Uuid::v7();
        $this->createdBy = $createdBy;
        $this->isVerified = null === $createdBy;
        $this->rename($name);
    }

    /** « Levi's » → « levis », « The North Face » → « thenorthface ». */
    public static function slugify(string $name): string
    {
        return (new UnicodeString($name))->ascii()->lower()->replaceMatches('/[^a-z0-9]+/', '')->toString();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    /** Renommer recalcule le slug : l'admin corrige « zara » en « Zara ». */
    public function rename(string $name): static
    {
        $this->name = trim($name);
        $this->slug = self::slugify($this->name);

        return $this;
    }

    public function getSlug(): string
    {
        return $this->slug;
    }

    public function getLogoMedia(): ?Media
    {
        return $this->logoMedia;
    }

    public function setLogoMedia(?Media $logoMedia): static
    {
        $this->logoMedia = $logoMedia;

        return $this;
    }

    public function isVerified(): bool
    {
        return $this->isVerified;
    }

    /** Validation par l'admin : la pastille disparaît, la marque rejoint la liste. */
    public function verify(): static
    {
        $this->isVerified = true;

        return $this;
    }

    public function getCreatedBy(): ?Profile
    {
        return $this->createdBy;
    }
}
