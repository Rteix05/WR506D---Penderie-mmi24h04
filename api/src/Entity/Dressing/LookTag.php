<?php

namespace App\Entity\Dressing;

use App\Entity\Inventory\Garment;
use App\Enum\Dressing\LookTagStatus;
use App\Repository\Dressing\LookTagRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Un point posé sur la photo d'un look, sur un vêtement porté.
 *
 * L'IA regarde la zone autour du point (l'app la découpe et l'envoie) :
 *  - elle reconnaît un vêtement du dressing : garment est rempli, MATCHED ;
 *  - elle voit un vêtement absent du dressing : suggestion décrit ce
 *    qu'elle voit (mêmes champs que le scan), de quoi pré-remplir l'ajout,
 *    NEW ;
 *  - elle ne dit rien d'exploitable : UNKNOWN.
 * L'utilisateur confirme ou corrige ensuite : CONFIRMED.
 */
#[ORM\Entity(repositoryClass: LookTagRepository::class)]
class LookTag
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: DailyLook::class, inversedBy: 'tags')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private DailyLook $look;

    #[ORM\Column(type: Types::FLOAT)]
    private float $x;

    #[ORM\Column(type: Types::FLOAT)]
    private float $y;

    /** L'ordre des points : leur numéro sur la photo. */
    #[ORM\Column]
    private int $position;

    #[ORM\Column(length: 20, enumType: LookTagStatus::class)]
    private LookTagStatus $status = LookTagStatus::Unknown;

    /** SET NULL : un vêtement réellement supprimé laisse le point à redésigner. */
    #[ORM\ManyToOne(targetEntity: Garment::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Garment $garment = null;

    /**
     * Ce que l'IA a vu, au format de la suggestion du scan (nom,
     * catégorie, couleurs, marque…).
     *
     * @var array<string, mixed>|null
     */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $suggestion = null;

    /**
     * La trace de l'analyse : le modèle qui a répondu et les échecs, ou
     * l'erreur si aucun n'a répondu.
     *
     * @var array<string, mixed>|null
     */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $detection = null;

    /** @internal Par DailyLook::addTag(). */
    public function __construct(DailyLook $look, float $x, float $y, int $position)
    {
        if ($x < 0 || $x > 1 || $y < 0 || $y > 1) {
            throw new \DomainException('Le point doit être sur la photo (x et y entre 0 et 1).');
        }
        $this->id = Uuid::v7();
        $this->look = $look;
        $this->x = $x;
        $this->y = $y;
        $this->position = $position;
    }

    /**
     * Le verdict de l'IA.
     *
     * @param array<string, mixed>|null $suggestion
     * @param array<string, mixed>      $detection
     */
    public function detected(?Garment $match, ?array $suggestion, array $detection): void
    {
        $this->garment = $match;
        $this->suggestion = $suggestion;
        $this->detection = $detection;
        $this->status = match (true) {
            null !== $match => LookTagStatus::Matched,
            null !== ($suggestion['name'] ?? null) => LookTagStatus::New,
            default => LookTagStatus::Unknown,
        };
    }

    /** L'utilisateur désigne le vêtement : celui de l'IA, un autre, ou celui qu'il vient de créer. */
    public function confirm(Garment $garment): void
    {
        $this->look->assertEditable();
        $this->garment = $garment;
        $this->status = LookTagStatus::Confirmed;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getLook(): DailyLook
    {
        return $this->look;
    }

    public function getX(): float
    {
        return $this->x;
    }

    public function getY(): float
    {
        return $this->y;
    }

    public function getPosition(): int
    {
        return $this->position;
    }

    /** Un vêtement reconnu ou confirmé, puis réellement supprimé : le point redevient « inconnu ». */
    public function getStatus(): LookTagStatus
    {
        return null === $this->garment && \in_array($this->status, [LookTagStatus::Confirmed, LookTagStatus::Matched], true)
            ? LookTagStatus::Unknown
            : $this->status;
    }

    public function getGarment(): ?Garment
    {
        return $this->garment;
    }

    /** @return array<string, mixed>|null */
    public function getSuggestion(): ?array
    {
        return $this->suggestion;
    }

    /** @return array<string, mixed>|null */
    public function getDetection(): ?array
    {
        return $this->detection;
    }
}
