<?php

namespace App\Entity\Dressing;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Enum\Dressing\SuggestionStatus;
use App\Enum\Dressing\Weather;
use App\Enum\Inventory\GarmentUsage;
use App\Repository\Dressing\OutfitSuggestionRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Une proposition du moteur de suggestion, avec le contexte qui l'a
 * produite (occasion, température, temps, figés à la génération). Garder
 * les suggestions à part des tenues permet de mesurer le taux
 * d'acceptation sans polluer le dressing.
 *
 *   PROPOSED ─accept→ ACCEPTED (une Outfit naît)
 *            ─reject→ REJECTED
 *            ─replace→ REPLACED (une autre suggestion a été demandée)
 */
#[ORM\Entity(repositoryClass: OutfitSuggestionRepository::class)]
#[ORM\Index(name: 'idx_outfit_suggestion_profile_generated', columns: ['profile_id', 'generated_at'])]
#[ORM\Index(name: 'idx_outfit_suggestion_status', columns: ['status'])]
class OutfitSuggestion
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    /** CASCADE : données de suggestion propres au profil (MDD). */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $profile;

    #[ORM\Column(length: 20, enumType: GarmentUsage::class)]
    private GarmentUsage $occasion;

    /** En degrés, au moment de la génération. */
    #[ORM\Column(type: Types::SMALLINT, nullable: true)]
    private ?int $temperature;

    #[ORM\Column(length: 20, nullable: true, enumType: Weather::class)]
    private ?Weather $weather;

    #[ORM\Column(length: 20, enumType: SuggestionStatus::class)]
    private SuggestionStatus $status = SuggestionStatus::Proposed;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $generatedAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $decidedAt = null;

    /** @var Collection<int, OutfitSuggestionGarment> */
    #[ORM\OneToMany(targetEntity: OutfitSuggestionGarment::class, mappedBy: 'suggestion', cascade: ['persist'])]
    #[ORM\OrderBy(['position' => 'ASC'])]
    private Collection $pieces;

    /** @param list<Garment> $garments */
    public function __construct(Profile $profile, GarmentUsage $occasion, array $garments, ?int $temperature = null, ?Weather $weather = null)
    {
        if ([] === $garments) {
            throw new \LogicException('Une suggestion propose au moins une pièce.');
        }
        $this->id = Uuid::v7();
        $this->profile = $profile;
        $this->occasion = $occasion;
        $this->temperature = $temperature;
        $this->weather = $weather;
        $this->generatedAt = new \DateTimeImmutable();
        $this->pieces = new ArrayCollection();
        foreach ($garments as $position => $garment) {
            $this->pieces->add(new OutfitSuggestionGarment($this, $garment, $position));
        }
    }

    /**
     * L'utilisateur remplace une pièce par une autre : l'ancienne reste,
     * marquée wasReplaced (c'est une donnée pour le moteur), la nouvelle
     * prend sa place.
     */
    public function swapGarment(Garment $old, Garment $new): static
    {
        $this->assertProposed();
        foreach ($this->pieces as $piece) {
            if ($piece->getGarment() === $new) {
                throw new \LogicException('Cette pièce fait déjà partie de la suggestion.');
            }
        }
        foreach ($this->pieces as $piece) {
            if ($piece->getGarment() === $old && !$piece->wasReplaced()) {
                $piece->markReplaced();
                $this->pieces->add(new OutfitSuggestionGarment($this, $new, $piece->getPosition()));

                return $this;
            }
        }
        throw new \LogicException('Cette pièce ne fait pas partie de la suggestion.');
    }

    /** Accepter : la suggestion devient une tenue, avec les pièces gardées. */
    public function accept(string $outfitName): Outfit
    {
        $this->decide(SuggestionStatus::Accepted);

        return Outfit::fromSuggestion($this, $outfitName);
    }

    public function reject(): static
    {
        return $this->decide(SuggestionStatus::Rejected);
    }

    /** Une autre suggestion a été demandée à la place de celle-ci. */
    public function replace(): static
    {
        return $this->decide(SuggestionStatus::Replaced);
    }

    private function decide(SuggestionStatus $status): static
    {
        $this->assertProposed();
        $this->status = $status;
        $this->decidedAt = new \DateTimeImmutable();

        return $this;
    }

    private function assertProposed(): void
    {
        if (SuggestionStatus::Proposed !== $this->status) {
            throw new \LogicException(\sprintf('Cette suggestion est déjà close (%s).', $this->status->value));
        }
    }

    /** @return list<Garment> les pièces proposées, sans celles qui ont été remplacées */
    public function getKeptGarments(): array
    {
        $kept = array_filter($this->pieces->toArray(), static fn (OutfitSuggestionGarment $p) => !$p->wasReplaced());
        usort($kept, static fn (OutfitSuggestionGarment $a, OutfitSuggestionGarment $b) => $a->getPosition() <=> $b->getPosition());

        return array_map(static fn (OutfitSuggestionGarment $p) => $p->getGarment(), $kept);
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getProfile(): Profile
    {
        return $this->profile;
    }

    public function getOccasion(): GarmentUsage
    {
        return $this->occasion;
    }

    public function getTemperature(): ?int
    {
        return $this->temperature;
    }

    public function getWeather(): ?Weather
    {
        return $this->weather;
    }

    public function getStatus(): SuggestionStatus
    {
        return $this->status;
    }

    public function getGeneratedAt(): \DateTimeImmutable
    {
        return $this->generatedAt;
    }

    public function getDecidedAt(): ?\DateTimeImmutable
    {
        return $this->decidedAt;
    }

    /** @return Collection<int, OutfitSuggestionGarment> */
    public function getPieces(): Collection
    {
        return $this->pieces;
    }
}
