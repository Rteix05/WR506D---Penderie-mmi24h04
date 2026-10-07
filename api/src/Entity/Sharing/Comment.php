<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use App\Entity\Trait\TimestampableTrait;
use App\Repository\Sharing\CommentRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Un commentaire sur un contenu partagé.
 *
 * Héritage SINGLE_TABLE, comme Share : ItemComment, GarmentComment,
 * CollectionComment, PostComment et ListingComment (annonces de vente,
 * confirmé le 21/09).
 *
 * Le commentaire mémorise le partage sous lequel il a été écrit (nul si
 * l'auteur est le propriétaire). Qui voit quoi :
 *  - le propriétaire voit tout ;
 *  - un tiers qui peut lire (partage READ ou EDIT) voit et écrit des
 *    commentaires, si l'audience est une audience d'amis (SPECIFIC,
 *    FRIENDS) ; abonnés et lien restent en lecture seule (30/09).
 */
#[ORM\Entity(repositoryClass: CommentRepository::class)]
#[ORM\InheritanceType('SINGLE_TABLE')]
#[ORM\DiscriminatorColumn(name: 'target_type', type: 'string', length: 20)]
#[ORM\DiscriminatorMap([
    'ITEM' => ItemComment::class,
    'GARMENT' => GarmentComment::class,
    'COLLECTION' => CollectionComment::class,
    'POST' => PostComment::class,
    'LISTING' => ListingComment::class,
])]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_comment_share', columns: ['share_id'])]
abstract class Comment
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    protected Uuid $id;

    /** RESTRICT : réaffecté au profil fantôme, le fil des autres reste intact. */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    protected Profile $author;

    #[ORM\ManyToOne(targetEntity: Share::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    protected ?Share $share;

    /** La réponse pointe son parent, toujours sur la même cible. */
    #[ORM\ManyToOne(targetEntity: self::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    protected ?Comment $parent;

    #[ORM\Column(type: Types::TEXT)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 2000)]
    protected string $body;

    /** Suppression douce : un parent supprimé casserait le fil des réponses. */
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    protected ?\DateTimeImmutable $deletedAt = null;

    /** Masquage par la modération. */
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    protected ?\DateTimeImmutable $hiddenAt = null;

    protected function __construct(Profile $author, string $body, ?Share $share, ?Comment $parent)
    {
        if (null !== $share && !$share->isActive()) {
            throw new \LogicException('Ce partage n\'est plus actif.');
        }
        // Lire inclut commenter, mais seulement entre amis : un abonné ou un
        // visiteur par lien ne commente jamais (décision du 30/09).
        if (null !== $share && !$share->getAudience()->allowsComments()) {
            throw new \LogicException('Ce partage ne permet pas de commenter.');
        }

        $this->id = Uuid::v7();
        $this->author = $author;
        $this->body = $body;
        $this->share = $share;
        $this->parent = $parent;
    }

    /** L'identifiant de la cible commentée, pour vérifier qu'une réponse reste dessus. */
    abstract public function getTargetId(): Uuid;

    protected function assertReplyOnSameTarget(): void
    {
        if (null === $this->parent) {
            return;
        }
        if ($this->parent::class !== static::class || !$this->parent->getTargetId()->equals($this->getTargetId())) {
            throw new \LogicException('Une réponse porte sur la même cible que le commentaire auquel elle répond.');
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

    public function getShare(): ?Share
    {
        return $this->share;
    }

    public function getParent(): ?Comment
    {
        return $this->parent;
    }

    public function getBody(): string
    {
        return $this->body;
    }

    public function edit(string $body): static
    {
        $this->body = $body;

        return $this;
    }

    public function getDeletedAt(): ?\DateTimeImmutable
    {
        return $this->deletedAt;
    }

    public function softDelete(): static
    {
        $this->deletedAt ??= new \DateTimeImmutable();

        return $this;
    }

    public function getHiddenAt(): ?\DateTimeImmutable
    {
        return $this->hiddenAt;
    }

    public function hide(): static
    {
        $this->hiddenAt ??= new \DateTimeImmutable();

        return $this;
    }

    public function unhide(): static
    {
        $this->hiddenAt = null;

        return $this;
    }

    public function isVisible(): bool
    {
        return null === $this->deletedAt && null === $this->hiddenAt;
    }
}
