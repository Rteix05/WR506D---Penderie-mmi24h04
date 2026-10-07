<?php

namespace App\Entity\Identity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Media\Media;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Identity\ProfileType;
use App\Repository\Identity\ProfileRepository;
use App\State\ProfileDeletionProcessor;
use App\Validator\Identity\ValidGuardianship;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Serializer\Attribute\Groups;
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
 *  - CHECK sur la liste des valeurs de type.
 *
 * Suppression : la ligne est réellement supprimée. Ce qui doit lui survivre
 * (prêts terminés, commandes, commentaires…) est d'abord réaffecté au profil
 * fantôme GHOST_ID, inséré par la migration. Un profil banni, lui, n'est pas
 * supprimé : il est suspendu (suspendedAt), ce qui reste réversible et garde
 * la trace de qui a fait quoi.
 */
#[ORM\Entity(repositoryClass: ProfileRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_profile_account', columns: ['account_id'])]
#[ORM\Index(name: 'idx_profile_guardian', columns: ['guardian_id'])]
#[ORM\UniqueConstraint(name: 'uniq_profile_default_per_account', columns: ['account_id'], options: ['where' => '(is_default = true)'])]
#[UniqueEntity(fields: ['username'], message: 'Cet identifiant est déjà pris.')]
#[ValidGuardianship]
#[ApiResource(
    shortName: 'Profile',
    operations: [
        new GetCollection(),
        new Get(security: "object.getAccount() == user"),
        // Le tuteur supprime le profil d'un enfant (transferts, profil fantôme, blocages :
        // voir ProfileDeleter). 403 si ce n'est pas le tuteur, 409 si un prêt ou une
        // commande est en cours, 422 pour un profil adulte (décision en attente).
        new Delete(security: "object.getAccount() == user", processor: ProfileDeletionProcessor::class),
    ],
    normalizationContext: ['groups' => ['profile:read']],
)]
class Profile
{
    use TimestampableTrait;

    public const ADULT_AGE = 18;

    /**
     * Le profil « Profil supprimé », auquel sont réaffectées les lignes qui
     * doivent survivre à une suppression. Inséré par la migration, jamais
     * supprimé, jamais ouvert : son compte n'a pas de mot de passe.
     */
    public const GHOST_ID = '00000000-0000-7000-8000-000000000001';

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[Groups(['profile:read'])]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Account::class, inversedBy: 'profiles')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Account $account;

    /** Le profil adulte responsable. Obligatoire si type = CHILD. */
    #[ORM\ManyToOne(targetEntity: self::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'RESTRICT')]
    private ?Profile $guardian = null;

    #[ORM\Column(length: 80)]
    #[Assert\NotBlank]
    #[Assert\Length(min: 1, max: 80)]
    private string $firstName;

    #[ORM\Column(length: 80)]
    #[Assert\NotBlank]
    #[Assert\Length(min: 1, max: 80)]
    private string $lastName;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    #[Assert\LessThan('today', message: 'La date de naissance doit être passée.')]
    #[Assert\GreaterThan('-120 years', message: 'Cette date de naissance n\'est pas plausible.')]
    private \DateTimeImmutable $dateOfBirth;

    /** L'identifiant public, celui qu'un ami cherche. */
    #[ORM\Column(length: 30, unique: true)]
    #[Assert\NotBlank]
    #[Assert\Length(min: 3, max: 30)]
    #[Assert\Regex('/^[a-z0-9.-]+$/', message: 'Minuscules, chiffres, tirets et points uniquement.')]
    #[Groups(['profile:read'])]
    private string $username;

    #[ORM\Column(length: 60)]
    #[Assert\NotBlank]
    #[Assert\Length(min: 1, max: 60)]
    #[Groups(['profile:read'])]
    private string $displayName;

    #[ORM\Column(length: 20, enumType: ProfileType::class)]
    #[Groups(['profile:read'])]
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

    public function getFirstName(): string
    {
        return $this->firstName;
    }

    public function setFirstName(string $firstName): static
    {
        $this->firstName = $firstName;

        return $this;
    }

    public function getLastName(): string
    {
        return $this->lastName;
    }

    public function setLastName(string $lastName): static
    {
        $this->lastName = $lastName;

        return $this;
    }

    public function getDateOfBirth(): \DateTimeImmutable
    {
        return $this->dateOfBirth;
    }

    public function setDateOfBirth(\DateTimeImmutable $dateOfBirth): static
    {
        $this->dateOfBirth = $dateOfBirth;

        return $this;
    }

    public function getAge(?\DateTimeImmutable $at = null): int
    {
        return $this->dateOfBirth->diff($at ?? new \DateTimeImmutable('today'))->y;
    }

    public function isOfAge(): bool
    {
        return $this->getAge() >= self::ADULT_AGE;
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

    public function isGhost(): bool
    {
        return self::GHOST_ID === $this->id->toRfc4122();
    }

    /** @return Collection<int, ProfilePermission> */
    public function getPermissions(): Collection
    {
        return $this->permissions;
    }
}
