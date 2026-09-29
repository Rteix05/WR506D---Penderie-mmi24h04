<?php

namespace App\Entity\Identity;

use App\Entity\Trait\TimestampableTrait;
use App\Repository\Identity\AccountRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * L'identifiant de connexion. Ne possède aucun contenu : il donne accès à
 * un ou plusieurs profils. L'identité réelle (prénom, nom, date de
 * naissance) vit sur Profile, jamais ici.
 *
 * Supprimer un compte, c'est supprimer ses profils (voir Profile) puis la
 * ligne elle-même : ce qui doit survivre est réaffecté au compte fantôme.
 * Un compte banni n'est pas supprimé : ses profils sont suspendus.
 */
#[ORM\Entity(repositoryClass: AccountRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[UniqueEntity(fields: ['email'], message: 'Un compte existe déjà avec cette adresse.')]
class Account implements UserInterface, PasswordAuthenticatedUserInterface
{
    use TimestampableTrait;

    public const ROLE_USER = 'ROLE_USER';
    public const ROLE_ADMIN = 'ROLE_ADMIN';

    /** Le compte qui porte le profil fantôme (Profile::GHOST_ID). */
    public const GHOST_ID = '00000000-0000-7000-8000-000000000000';

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\Column(length: 180, unique: true)]
    #[Assert\NotBlank]
    #[Assert\Email]
    #[Assert\Length(max: 180)]
    private string $email;

    /** Hash du mot de passe, jamais le mot de passe en clair. */
    #[ORM\Column]
    private string $password = '';

    /** @var list<string> */
    #[ORM\Column(type: Types::JSON)]
    private array $roles = [];

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $emailVerifiedAt = null;

    #[ORM\Column(length: 10)]
    #[Assert\NotBlank]
    #[Assert\Locale]
    private string $locale = 'fr';

    /** @var Collection<int, Profile> */
    #[ORM\OneToMany(targetEntity: Profile::class, mappedBy: 'account')]
    private Collection $profiles;

    public function __construct(string $email)
    {
        $this->id = Uuid::v7();
        $this->email = $email;
        $this->profiles = new ArrayCollection();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function setEmail(string $email): static
    {
        $this->email = $email;

        return $this;
    }

    public function getUserIdentifier(): string
    {
        return $this->email;
    }

    public function getPassword(): string
    {
        return $this->password;
    }

    public function setPassword(string $hashedPassword): static
    {
        $this->password = $hashedPassword;

        return $this;
    }

    /**
     * ROLE_USER est toujours accordé ; seul ROLE_ADMIN est stocké.
     *
     * @return list<string>
     */
    public function getRoles(): array
    {
        return array_values(array_unique([...$this->roles, self::ROLE_USER]));
    }

    /** @param list<string> $roles */
    public function setRoles(array $roles): static
    {
        $this->roles = array_values(array_diff($roles, [self::ROLE_USER]));

        return $this;
    }

    public function isAdmin(): bool
    {
        return \in_array(self::ROLE_ADMIN, $this->roles, true);
    }

    /** Aucune donnée sensible en clair à effacer : le mot de passe est déjà hashé. */
    #[\Deprecated]
    public function eraseCredentials(): void
    {
    }

    public function getEmailVerifiedAt(): ?\DateTimeImmutable
    {
        return $this->emailVerifiedAt;
    }

    public function markEmailVerified(): static
    {
        $this->emailVerifiedAt ??= new \DateTimeImmutable();

        return $this;
    }

    public function getLocale(): string
    {
        return $this->locale;
    }

    public function setLocale(string $locale): static
    {
        $this->locale = $locale;

        return $this;
    }

    public function isGhost(): bool
    {
        return self::GHOST_ID === $this->id->toRfc4122();
    }

    /** @return Collection<int, Profile> */
    public function getProfiles(): Collection
    {
        return $this->profiles;
    }
}
