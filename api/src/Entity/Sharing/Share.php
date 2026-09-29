<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use App\Repository\Sharing\ShareRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * L'autorisation d'accès à UNE ressource précise. C'est la seule porte vers
 * un contenu privé : ni l'amitié ni l'abonnement n'ouvrent quoi que ce soit.
 *
 * Héritage SINGLE_TABLE (décision du 18/09) : une table share, un
 * discriminant target_type, et une colonne de cible par sous-type
 * (ItemShare, GarmentShare, RoomShare, BoxShare, CollectionShare). La
 * migration garantit qu'une ligne ne remplit que la colonne de son type.
 *
 * Jamais supprimé : révoquer renseigne revokedAt, pour que les
 * commentaires écrits sous ce partage gardent leur contexte.
 */
#[ORM\Entity(repositoryClass: ShareRepository::class)]
#[ORM\InheritanceType('SINGLE_TABLE')]
#[ORM\DiscriminatorColumn(name: 'target_type', type: 'string', length: 20)]
#[ORM\DiscriminatorMap([
    'ITEM' => ItemShare::class,
    'GARMENT' => GarmentShare::class,
    'ROOM' => RoomShare::class,
    'BOX' => BoxShare::class,
    'COLLECTION' => CollectionShare::class,
])]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_share_owner_revoked', columns: ['owner_id', 'revoked_at'])]
abstract class Share
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    protected Uuid $id;

    /** RESTRICT : réaffecté au profil fantôme à la suppression du profil. */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    protected Profile $owner;

    #[ORM\Column(length: 20, enumType: ShareAudience::class)]
    protected ShareAudience $audience;

    #[ORM\Column(length: 20, enumType: AccessLevel::class)]
    protected AccessLevel $accessLevel;

    /** Le jeton du lien, pour une audience LINK seulement (CHECK en base). */
    #[ORM\Column(length: 64, unique: true, nullable: true)]
    protected ?string $token = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    protected ?\DateTimeImmutable $expiresAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    protected ?\DateTimeImmutable $revokedAt = null;

    #[ORM\Column]
    protected int $viewCount = 0;

    /** @var Collection<int, ShareRecipient> */
    #[ORM\OneToMany(targetEntity: ShareRecipient::class, mappedBy: 'share')]
    protected Collection $recipients;

    protected function __construct(Profile $owner, ShareAudience $audience, AccessLevel $accessLevel)
    {
        if ($owner->isGhost()) {
            throw new \LogicException('Le profil fantôme ne partage rien.');
        }
        if (!$audience->allowsComments() && AccessLevel::View !== $accessLevel) {
            throw new \LogicException('Un partage aux abonnés ou par lien est en lecture seule.');
        }

        $this->id = Uuid::v7();
        $this->owner = $owner;
        $this->audience = $audience;
        $this->accessLevel = $accessLevel;
        $this->recipients = new ArrayCollection();
        if (ShareAudience::Link === $audience) {
            // 32 octets aléatoires en base64url : 43 caractères, impossible à deviner.
            $this->token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
        }
    }

    /** Le propriétaire de la ressource partagée : seul lui peut la partager. */
    abstract public function getTargetOwner(): Profile;

    protected function assertOwnsTarget(): void
    {
        if (!$this->getTargetOwner()->getId()->equals($this->owner->getId())) {
            throw new \LogicException('On ne partage que ce qu\'on possède.');
        }
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getOwner(): Profile
    {
        return $this->owner;
    }

    public function getAudience(): ShareAudience
    {
        return $this->audience;
    }

    public function getAccessLevel(): AccessLevel
    {
        return $this->accessLevel;
    }

    public function getToken(): ?string
    {
        return $this->token;
    }

    public function getExpiresAt(): ?\DateTimeImmutable
    {
        return $this->expiresAt;
    }

    public function setExpiresAt(?\DateTimeImmutable $expiresAt): static
    {
        $this->expiresAt = $expiresAt;

        return $this;
    }

    public function getRevokedAt(): ?\DateTimeImmutable
    {
        return $this->revokedAt;
    }

    public function revoke(): static
    {
        $this->revokedAt ??= new \DateTimeImmutable();

        return $this;
    }

    /** Actif = ni révoqué, ni expiré. */
    public function isActive(?\DateTimeImmutable $at = null): bool
    {
        $at ??= new \DateTimeImmutable();

        return null === $this->revokedAt && (null === $this->expiresAt || $this->expiresAt > $at);
    }

    public function getViewCount(): int
    {
        return $this->viewCount;
    }

    public function recordView(): static
    {
        ++$this->viewCount;

        return $this;
    }

    /** @return Collection<int, ShareRecipient> */
    public function getRecipients(): Collection
    {
        return $this->recipients;
    }

    /** Nommer un destinataire : seulement pour une audience SPECIFIC. */
    public function addRecipient(Profile $profile): ShareRecipient
    {
        if (ShareAudience::Specific !== $this->audience) {
            throw new \LogicException('Seul un partage à des personnes choisies a des destinataires nommés.');
        }
        if ($profile->getId()->equals($this->owner->getId())) {
            throw new \LogicException('Le propriétaire n\'est pas son propre destinataire.');
        }
        foreach ($this->recipients as $recipient) {
            if ($recipient->getProfile()->getId()->equals($profile->getId())) {
                return $recipient;
            }
        }

        $recipient = new ShareRecipient($this, $profile);
        $this->recipients->add($recipient);

        return $recipient;
    }
}
