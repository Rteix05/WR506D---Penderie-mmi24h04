<?php

namespace App\Entity\Sale;

use App\Entity\Identity\Profile;
use App\Entity\Trait\TimestampableTrait;
use App\Repository\Sale\AddressRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Le carnet d'adresses d'un profil, librement modifiable. Sert à
 * pré-remplir une commande (OrderAddress::copyOf), jamais à la décrire
 * après coup.
 */
#[ORM\Entity(repositoryClass: AddressRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_address_profile', columns: ['profile_id'])]
#[ORM\UniqueConstraint(name: 'uniq_address_default_per_profile', columns: ['profile_id'], options: ['where' => '(is_default = true)'])]
class Address
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    /** CASCADE : le carnet appartient au profil ; les commandes gardent leur copie. */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $profile;

    /** « Domicile », « Bureau ». */
    #[ORM\Column(length: 50)]
    #[Assert\NotBlank]
    private string $label;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    private string $line1;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $line2 = null;

    #[ORM\Column(length: 20)]
    #[Assert\NotBlank]
    private string $postalCode;

    #[ORM\Column(length: 100)]
    #[Assert\NotBlank]
    private string $city;

    /** Code pays ISO 3166-1 alpha-2 : « FR ». */
    #[ORM\Column(length: 2)]
    // Pas Assert\Country : il exige le composant symfony/intl, non installé.
    #[Assert\Regex('/^[A-Z]{2}$/', message: 'Code pays attendu : deux lettres majuscules (« FR »).')]
    private string $country;

    #[ORM\Column]
    private bool $isDefault = false;

    public function __construct(Profile $profile, string $label, string $line1, string $postalCode, string $city, string $country = 'FR')
    {
        $this->id = Uuid::v7();
        $this->profile = $profile;
        $this->label = $label;
        $this->line1 = $line1;
        $this->postalCode = $postalCode;
        $this->city = $city;
        $this->country = $country;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getProfile(): Profile
    {
        return $this->profile;
    }

    public function getLabel(): string
    {
        return $this->label;
    }

    public function getLine1(): string
    {
        return $this->line1;
    }

    public function getLine2(): ?string
    {
        return $this->line2;
    }

    public function setLine2(?string $line2): static
    {
        $this->line2 = $line2;

        return $this;
    }

    public function getPostalCode(): string
    {
        return $this->postalCode;
    }

    public function getCity(): string
    {
        return $this->city;
    }

    public function getCountry(): string
    {
        return $this->country;
    }

    /** Déménager : modifier son carnet ne réécrit jamais une commande passée. */
    public function update(string $line1, ?string $line2, string $postalCode, string $city, string $country): static
    {
        $this->line1 = $line1;
        $this->line2 = $line2;
        $this->postalCode = $postalCode;
        $this->city = $city;
        $this->country = $country;

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
}
