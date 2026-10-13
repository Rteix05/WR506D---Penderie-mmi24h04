<?php

namespace App\Entity\Dressing;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Media\Media;
use App\Entity\Sharing\Post;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Dressing\LookStatus;
use App\Enum\Dressing\LookTagStatus;
use App\Repository\Dressing\DailyLookRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Le look du jour : une photo de soi, et sur cette photo un point par
 * vêtement porté (LookTag). Chaque point est identifié par l'IA, parmi
 * les vêtements du dressing ou comme un vêtement nouveau.
 *
 * Un look par profil et par jour. Il est destiné à un post Instagram en
 * deux images (la photo, puis les vêtements) ; l'API ne publie rien sur
 * Instagram, elle tient seulement l'état du look (LookStatus).
 *
 * Il peut aussi être publié dans le fil de Penderie (Post) : la
 * publication met en avant une tenue faite de ses vêtements, et partage
 * donc ces vêtements, en lecture, à l'audience choisie (MDD).
 */
#[ORM\Entity(repositoryClass: DailyLookRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\UniqueConstraint(name: 'uniq_daily_look_owner_day', columns: ['owner_id', 'worn_on'])]
class DailyLook
{
    use TimestampableTrait;

    /** Assez pour une tenue complète, accessoires compris. */
    public const MAX_TAGS = 12;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    /** CASCADE : le look disparaît avec son profil (MDD). */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $owner;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $wornOn;

    /** RESTRICT : la photo se supprime avec le look (LookController::delete). */
    #[ORM\ManyToOne(targetEntity: Media::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Media $photo;

    #[ORM\Column(length: 20, enumType: LookStatus::class)]
    private LookStatus $status = LookStatus::Tagging;

    /** La légende du post. */
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Assert\Length(max: 2200)]
    private ?string $caption = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $postedAt = null;

    /** La publication dans le fil. SET NULL : le look survit à sa publication. */
    #[ORM\OneToOne(targetEntity: Post::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Post $post = null;

    /** @var Collection<int, LookTag> */
    #[ORM\OneToMany(targetEntity: LookTag::class, mappedBy: 'look', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['position' => 'ASC'])]
    private Collection $tags;

    public function __construct(Profile $owner, Media $photo, ?\DateTimeImmutable $wornOn = null)
    {
        $this->id = Uuid::v7();
        $this->owner = $owner;
        $this->photo = $photo;
        $this->wornOn = $wornOn ?? new \DateTimeImmutable('today');
        $this->tags = new ArrayCollection();
    }

    /** Pose un point. x et y : position sur la photo, de 0 à 1 depuis le coin haut gauche. */
    public function addTag(float $x, float $y): LookTag
    {
        $this->assertEditable();
        if ($this->tags->count() >= self::MAX_TAGS) {
            throw new \DomainException(\sprintf('%d vêtements au plus par look.', self::MAX_TAGS));
        }
        $position = 0;
        foreach ($this->tags as $tag) {
            $position = max($position, $tag->getPosition() + 1);
        }
        $tag = new LookTag($this, $x, $y, $position);
        $this->tags->add($tag);

        return $tag;
    }

    public function removeTag(LookTag $tag): void
    {
        $this->assertEditable();
        $this->tags->removeElement($tag);
    }

    /**
     * Change l'état. Pour passer à READY, il faut au moins un point, et que
     * chaque point désigne un vêtement : la seconde image du post les liste.
     */
    public function moveTo(LookStatus $next): void
    {
        if ($next === $this->status) {
            return;
        }
        if (LookStatus::Tagging === $next && $this->isPublished()) {
            throw new \DomainException('Ce look est publié dans le fil : retire la publication pour modifier ses points.');
        }
        if (!$this->status->canMoveTo($next)) {
            throw new \DomainException(LookStatus::Posted === $this->status ? 'Ce look est déjà posté : il ne se modifie plus.' : 'Le look doit d\'abord être prêt à poster.');
        }
        if (LookStatus::Ready === $next) {
            if ($this->tags->isEmpty()) {
                throw new \DomainException('Place au moins un point sur un vêtement.');
            }
            foreach ($this->tags as $tag) {
                if (LookTagStatus::Confirmed !== $tag->getStatus()) {
                    throw new \DomainException('Chaque point doit désigner un vêtement de ton dressing.');
                }
            }
        }
        $this->status = $next;
        $this->postedAt = LookStatus::Posted === $next ? new \DateTimeImmutable() : null;
    }

    /** @return list<Garment> les vêtements désignés, sans doublon, dans l'ordre des points */
    public function getGarments(): array
    {
        $garments = [];
        foreach ($this->tags as $tag) {
            $garment = $tag->getGarment();
            if (null !== $garment) {
                $garments[(string) $garment->getId()] = $garment;
            }
        }

        return array_values($garments);
    }

    /** @internal Aussi par LookTag : un point ne change plus une fois le look prêt. */
    public function assertEditable(): void
    {
        if (LookStatus::Tagging !== $this->status) {
            throw new \DomainException('Repasse le look en préparation pour modifier ses points.');
        }
    }

    /** Publier dans le fil : seulement un look prêt (chaque point désigne un vêtement), une fois. */
    public function publishIn(Post $post): void
    {
        if (LookStatus::Tagging === $this->status) {
            throw new \DomainException('Le look doit d\'abord être prêt : chaque point désigne un vêtement.');
        }
        if ($this->isPublished()) {
            throw new \DomainException('Ce look est déjà publié dans le fil.');
        }
        $this->post = $post;
    }

    public function getPost(): ?Post
    {
        return $this->post;
    }

    /** Une publication supprimée ne compte plus : le look peut être republié. */
    public function isPublished(): bool
    {
        return null !== $this->post && null === $this->post->getDeletedAt();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getOwner(): Profile
    {
        return $this->owner;
    }

    public function getWornOn(): \DateTimeImmutable
    {
        return $this->wornOn;
    }

    public function getPhoto(): Media
    {
        return $this->photo;
    }

    public function getStatus(): LookStatus
    {
        return $this->status;
    }

    public function getCaption(): ?string
    {
        return $this->caption;
    }

    public function setCaption(?string $caption): static
    {
        $this->caption = null === $caption || '' === trim($caption) ? null : trim($caption);

        return $this;
    }

    public function getPostedAt(): ?\DateTimeImmutable
    {
        return $this->postedAt;
    }

    /** @return Collection<int, LookTag> */
    public function getTags(): Collection
    {
        return $this->tags;
    }
}
