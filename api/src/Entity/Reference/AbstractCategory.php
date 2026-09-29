<?php

namespace App\Entity\Reference;

use App\Entity\Identity\Profile;
use App\Entity\Trait\TimestampableTrait;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\String\Slugger\AsciiSlugger;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Ce que partagent les deux arbres de catégories (objets, vêtements), qui
 * restent deux tables distinctes, jamais mélangées.
 *
 * owner nul = catégorie fournie par l'application (isSystem), chargée par
 * app:reference-data:load ; renseigné = catégorie créée par un profil.
 * La cohérence isSystem ⇔ owner nul est aussi un CHECK en base.
 */
#[ORM\MappedSuperclass]
#[ORM\HasLifecycleCallbacks]
abstract class AbstractCategory
{
    use TimestampableTrait;

    public const MAX_DEPTH = 3;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    protected Uuid $id;

    #[ORM\Column(length: 80)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 80)]
    protected string $name;

    /** Identifiant stable : clé de chargement pour une catégorie système. */
    #[ORM\Column(length: 80)]
    #[Assert\NotBlank]
    #[Assert\Regex('/^[a-z0-9-]+$/')]
    protected string $slug;

    /** Nom d'icône du design system, facultatif. */
    #[ORM\Column(length: 50, nullable: true)]
    protected ?string $icon = null;

    /** RESTRICT : transférée au tuteur ou traitée à la suppression du profil. */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'RESTRICT')]
    protected ?Profile $owner;

    #[ORM\Column]
    protected bool $isSystem;

    public function __construct(string $name, ?Profile $owner = null, ?string $slug = null)
    {
        $this->id = Uuid::v7();
        $this->name = $name;
        $this->owner = $owner;
        $this->isSystem = null === $owner;
        $this->slug = $slug ?? self::slugify($name);
    }

    public static function slugify(string $name): string
    {
        return (new AsciiSlugger('fr'))->slug($name)->lower()->toString();
    }

    public function getId(): Uuid
    {
        return $this->id;
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

    public function getSlug(): string
    {
        return $this->slug;
    }

    public function getIcon(): ?string
    {
        return $this->icon;
    }

    public function setIcon(?string $icon): static
    {
        $this->icon = $icon;

        return $this;
    }

    public function getOwner(): ?Profile
    {
        return $this->owner;
    }

    public function isSystem(): bool
    {
        return $this->isSystem;
    }

    /** Transfert au tuteur à la suppression d'un profil enfant. */
    public function transferTo(Profile $owner): static
    {
        if ($this->isSystem) {
            throw new \LogicException('Une catégorie système n\'appartient à personne.');
        }
        $this->owner = $owner;

        return $this;
    }

    abstract public function getParent(): ?static;

    /** Profondeur dans l'arbre : 1 pour une racine. */
    public function getDepth(): int
    {
        $depth = 1;
        $seen = [$this->id->toRfc4122() => true];
        for ($node = $this->getParent(); null !== $node; $node = $node->getParent()) {
            $key = $node->getId()->toRfc4122();
            if (isset($seen[$key])) {
                return \PHP_INT_MAX; // cycle
            }
            $seen[$key] = true;
            ++$depth;
        }

        return $depth;
    }
}
