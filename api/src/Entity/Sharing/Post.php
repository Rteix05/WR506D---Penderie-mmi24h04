<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use App\Repository\Sharing\PostRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection as DoctrineCollection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Une publication du fil d'actualité.
 *
 * Le point clé du MDD : publier une collection ne la rend pas publique.
 * Quand une ressource est mise en avant, la publication crée et PORTE un
 * Share de même audience ; « Voir la collection › » passe par ce partage,
 * et le révoquer ferme la porte sans supprimer la publication. Il n'y a
 * pas de seconde voie d'accès au contenu privé.
 *
 * La ressource mise en avant EST la cible de ce partage (29/09) : le MDD
 * prévoyait aussi des colonnes collection · item · garment sur Post, mais
 * ce double chemin vers la même ressource rendait sa suppression
 * impossible (deux SET NULL en conflit) et permettait une publication qui
 * pointe une ressource et en partage une autre. Une seule source de vérité.
 *
 * Conséquence : une audience SPECIFIC désigne les destinataires de ce
 * partage ; une publication SPECIFIC a donc toujours une ressource.
 */
#[ORM\Entity(repositoryClass: PostRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_post_author_published', columns: ['author_id', 'published_at'])]
#[ORM\Index(name: 'idx_post_published', columns: ['published_at'])]
class Post
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    /** RESTRICT : traité par le service de suppression du profil. */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Profile $author;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Assert\Length(max: 2000)]
    private ?string $body;

    /** FRIENDS, FOLLOWERS ou SPECIFIC ; jamais LINK (CHECK en base). */
    #[ORM\Column(length: 20, enumType: ShareAudience::class)]
    private ShareAudience $audience;

    /**
     * L'accès à la ressource mise en avant, créé à la publication. SET NULL :
     * si la ressource disparaît réellement, son partage aussi, et la
     * publication reste, sans ressource.
     */
    #[ORM\OneToOne(targetEntity: Share::class, cascade: ['persist'])]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Share $share = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $publishedAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $deletedAt = null;

    /** Toujours faux pour une audience FOLLOWERS (CHECK en base). */
    #[ORM\Column]
    private bool $commentsEnabled;

    /** @var DoctrineCollection<int, PostMedia> */
    #[ORM\OneToMany(targetEntity: PostMedia::class, mappedBy: 'post')]
    #[ORM\OrderBy(['position' => 'ASC'])]
    private DoctrineCollection $media;

    /**
     * Publier. Si une ressource est mise en avant, le Share qui y donne
     * accès est créé ici, avec la même audience ; il est persisté avec la
     * publication, et se complète de ses destinataires si SPECIFIC.
     */
    public function __construct(
        Profile $author,
        ?string $body,
        ShareAudience $audience,
        bool $commentsEnabled = true,
        Collection|Item|Garment|null $featured = null,
    ) {
        if (ShareAudience::Link === $audience) {
            throw new \LogicException('Une publication s\'adresse à des amis ou à des abonnés, pas à un lien.');
        }
        if (ShareAudience::Specific === $audience && null === $featured) {
            throw new \LogicException('Une publication à des personnes choisies met en avant une ressource : ses destinataires sont ceux de son partage.');
        }

        $this->id = Uuid::v7();
        $this->author = $author;
        $this->body = $body;
        $this->audience = $audience;
        // Un abonné ne commente jamais (règle du MDD, CHECK en base).
        $this->commentsEnabled = $commentsEnabled && $audience->allowsComments();
        $this->publishedAt = new \DateTimeImmutable();
        $this->media = new ArrayCollection();

        if (null !== $featured) {
            $level = $this->commentsEnabled ? AccessLevel::Comment : AccessLevel::View;
            $this->share = match (true) {
                $featured instanceof Collection => new CollectionShare($author, $featured, $audience, $level),
                $featured instanceof Item => new ItemShare($author, $featured, $audience, $level),
                $featured instanceof Garment => new GarmentShare($author, $featured, $audience, $level),
            };
        }
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getAuthor(): Profile
    {
        return $this->author;
    }

    public function getBody(): ?string
    {
        return $this->body;
    }

    public function getAudience(): ShareAudience
    {
        return $this->audience;
    }

    /** La ressource mise en avant : la cible du partage porté par la publication. */
    public function getFeatured(): Collection|Item|Garment|null
    {
        return match (true) {
            $this->share instanceof CollectionShare => $this->share->getCollection(),
            $this->share instanceof ItemShare => $this->share->getItem(),
            $this->share instanceof GarmentShare => $this->share->getGarment(),
            default => null,
        };
    }

    public function getShare(): ?Share
    {
        return $this->share;
    }

    public function getPublishedAt(): \DateTimeImmutable
    {
        return $this->publishedAt;
    }

    public function isCommentsEnabled(): bool
    {
        return $this->commentsEnabled;
    }

    public function getDeletedAt(): ?\DateTimeImmutable
    {
        return $this->deletedAt;
    }

    /** Supprimer la publication révoque aussi l'accès qu'elle portait. */
    public function softDelete(): static
    {
        $this->deletedAt ??= new \DateTimeImmutable();
        $this->share?->revoke();

        return $this;
    }

    /** @return DoctrineCollection<int, PostMedia> */
    public function getMedia(): DoctrineCollection
    {
        return $this->media;
    }

    /** @internal Côté inverse, tenu à jour par PostMedia. */
    public function attachMedia(PostMedia $link): void
    {
        if (!$this->media->contains($link)) {
            $this->media->add($link);
        }
    }
}
