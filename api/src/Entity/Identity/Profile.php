<?php

namespace App\Entity\Identity;

use App\Entity\Media\Media;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Identity\ProfileType;
use App\Repository\Identity\ProfileRepository;
use App\Validator\Identity\ValidGuardianship;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * L'identité Penderie : propriétaire de tout le contenu et sujet de toutes
 * les relations sociales. Un compte ouvre un à n profils.
 *
 * Contraintes posées en base par la migration (Doctrine ne sait pas les
 * déclarer en attribut) :
 *  - CHECK type CHILD ⇒ guardian_id non nul ;
 *  - CHECK guardian_id ≠ id ;
 *  - CHECK date_of_birth < CURRENT_DATE ;
 *  - CHECK identité réelle présente tant que le profil n'est pas supprimé ;
 *  - CHECK sur la liste des valeurs de type.
 */
#[ORM\Entity(repositoryClass: ProfileRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_profile_account', columns: ['account_id'])]
#[ORM\Index(name: 'idx_profile_guardian', columns: ['guardian_id'])]
#[ORM\UniqueConstraint(name: 'uniq_profile_default_per_account', columns: ['account_id'], options: ['where' => '(is_default = true)'])]
#[UniqueEntity(fields: ['username'], message: 'Cet identifiant est déjà pris.')]
#[ValidGuardianship]
class Profile
{
    use TimestampableTrait;

    public const ADULT_AGE = 18;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Account::class, inversedBy: 'profiles')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Account $account;

    /** Le profil adulte responsable. Obligatoire si type = CHILD. */
    #[ORM\ManyToOne(targetEntity: self::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'RESTRICT')]
    private ?Profile $guardian = null;

    /** Nullable en base uniquement pour l'anonymisation d'un profil supprimé. */
    #[ORM\Column(length: 80, nullable: true)]
    #[Assert\NotBlank]
    #[Assert\Length(min: 1, max: 80)]
    private ?string $firstName;

    #[ORM\Column(length: 80, nullable: true)]
    #[Assert\NotBlank]
    #[Assert\Length(min: 1, max: 80)]
    private ?string $lastName;

    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    #[Assert\NotNull]
    #[Assert\LessThan('today', message: 'La date de naissance doit être passée.')]
    #[Assert\GreaterThan('-120 years', message: 'Cette date de naissance n\'est pas plausible.')]
    private ?\DateTimeImmutable $dateOfBirth;

    /** L'identifiant public, celui qu'un ami cherche. */
    #[ORM\Column(length: 30, unique: true)]
    #[Assert\NotBlank]
    #[Assert\Length(min: 3, max: 30)]
    #[Assert\Regex('/^[a-z0-9.-]+$/', message: 'Minuscules, chiffres, tirets et points uniquement.')]
    private string $username;

    #[ORM\Column(length: 60)]
    #[Assert\NotBlank]
    #[Assert\Length(min: 1, max: 60)]
    private string $displayName;

    #[ORM\Column(length: 20, enumType: ProfileType::class)]
    private ProfileType $type;

    #[ORM\ManyToOne(targetEntity: Media::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Media $avatarMedia = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Assert\Length(max: 500)]
    private ?string $bio = null;

    /** Le profil ouvert à la connexion. Un seul par compte (index unique partiel). */
    #[ORM\Column]
    private bool $isDefault = false;

    /** Suspension par la modération : bloque ce profil, pas les autres du compte. */
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $suspendedAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $deletedAt = null;

    /** @var Collection<int, ProfilePermission> */
    #[ORM\OneToMany(targetEntity: ProfilePermission::class, mappedBy: 'profile')]
    private Collection $permissions;

    public function __construct(
        Account $account,
        ProfileType $type,
        string $firstName,
        string $lastName,
        \DateTimeImmutable $dateOfBirth,
        string $username,
        ?Profile $guardian = null,
    ) {
        $this->id = Uuid::v7();
        $this->account = $account;
        $this->type = $type;
        $this->firstName = $firstName;
        $this->lastName = $lastName;
        $this->dateOfBirth = $dateOfBirth;
        $this->username = $username;
        $this->displayName = $firstName;
        $this->guardian = $guardian;
        $this->permissions = new ArrayCollection();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getAccount(): Account
    {
        return $this->account;
    }

    public function getGuardian(): ?Profile
    {
        return $this->guardian;
    }

    /**
     * Acte du tuteur, jamais du profil lui-même : ce champ ne doit figurer
     * dans aucun groupe d'écriture exposé à l'enfant.
     */
    public function setGuardian(?Profile $guardian): static
    {
        $this->guardian = $guardian;

        return $this;
    }

    public function getFirstName(): ?string
    {
        return $this->firstName;
    }

    public function setFirstName(string $firstName): static
    {
        $this->firstName = $firstName;

        return $this;
    }

    public function getLastName(): ?string
    {
        return $this->lastName;
    }

    public function setLastName(string $lastName): static
    {
        $this->lastName = $lastName;

        return $this;
    }

    public function getDateOfBirth(): ?\DateTimeImmutable
    {
        return $this->dateOfBirth;
    }

    public function setDateOfBirth(\DateTimeImmutable $dateOfBirth): static
    {
        $this->dateOfBirth = $dateOfBirth;

        return $this;
    }

    public function getAge(?\DateTimeImmutable $at = null): ?int
    {
        return $this->dateOfBirth?->diff($at ?? new \DateTimeImmutable('today'))->y;
    }

    public function isOfAge(): bool
    {
        return ($this->getAge() ?? 0) >= self::ADULT_AGE;
    }

    public function getUsername(): string
    {
        return $this->username;
    }

    public function setUsername(string $username): static
    {
        $this->username = $username;

        return $this;
    }

    public function getDisplayName(): string
    {
        return $this->displayName;
    }

    public function setDisplayName(string $displayName): static
    {
        $this->displayName = $displayName;

        return $this;
    }

    public function getType(): ProfileType
    {
        return $this->type;
    }

    /** Acte du tuteur (passage CHILD → ADULT à la majorité), comme setGuardian. */
    public function setType(ProfileType $type): static
    {
        $this->type = $type;

        return $this;
    }

    public function isChild(): bool
    {
        return ProfileType::Child === $this->type;
    }

    public function getAvatarMedia(): ?Media
    {
        return $this->avatarMedia;
    }

    public function setAvatarMedia(?Media $avatarMedia): static
    {
        $this->avatarMedia = $avatarMedia;

        return $this;
    }

    public function getBio(): ?string
    {
        return $this->bio;
    }

    public function setBio(?string $bio): static
    {
        $this->bio = $bio;

        return $this;
    }

    public function isDefault(): bool
    {
        return $this->isDefault;
    }

    public function setIsDefault(bool $isDefault): static
    {
        $this->isDefault = $isDefault;

        return $this;
    }

    public function getSuspendedAt(): ?\DateTimeImmutable
    {
        return $this->suspendedAt;
    }

    public function suspend(): static
    {
        $this->suspendedAt ??= new \DateTimeImmutable();

        return $this;
    }

    public function lift(): static
    {
        $this->suspendedAt = null;

        return $this;
    }

    public function getDeletedAt(): ?\DateTimeImmutable
    {
        return $this->deletedAt;
    }

    public function isDeleted(): bool
    {
        return null !== $this->deletedAt;
    }

    /**
     * Suppression douce + effacement des données personnelles (RGPD).
     *
     * La ligne survit pour que prêts terminés, commandes et commentaires
     * pointent toujours vers un profil existant, mais elle ne contient plus
     * rien de personnel, et l'identifiant public est libéré. Le transfert
     * des biens au tuteur est le travail d'un service, pas de l'entité.
     */
    public function anonymize(): static
    {
        $this->deletedAt ??= new \DateTimeImmutable();
        $this->firstName = null;
        $this->lastName = null;
        $this->dateOfBirth = null;
        $this->bio = null;
        $this->avatarMedia = null;
        $this->isDefault = false;
        $this->displayName = 'Profil supprimé';
        // « deleted. » + 22 caractères hexadécimaux aléatoires de l'UUID v7 :
        // 30 caractères, unique, conforme au format d'un username.
        $this->username = 'deleted.'.substr(str_replace('-', '', $this->id->toRfc4122()), -22);

        return $this;
    }

    /** @return Collection<int, ProfilePermission> */
    public function getPermissions(): Collection
    {
        return $this->permissions;
    }
}
