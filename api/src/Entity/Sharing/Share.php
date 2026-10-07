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
 * Tout est privé par défaut (décision du 30/09).
 *
 * Héritage SINGLE_TABLE (décision du 18/09) : une table share, un
 * discriminant target_type, et une colonne de cible par sous-type
 * (ItemShare, GarmentShare, RoomShare, BoxShare, PlaceShare, OutfitShare,
 * CollectionShare). La migration garantit qu'une ligne ne remplit que la
 * colonne de son type.
 *
 * Le propriétaire (owner) est TOUJOURS celui de la cible. Celui qui partage
 * (sharedBy) est le propriétaire, ou une personne à qui il a donné le
 * droit de modifier : elle peut repartager, en lecture seule, et l'objet
 * reste affiché comme celui du propriétaire (« repartagé par … »).
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
    'PLACE' => PlaceShare::class,
    'OUTFIT' => OutfitShare::class,
])]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_share_owner_revoked', columns: ['owner_id', 'revoked_at'])]
abstract class Share
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    protected Uuid $id;

    /** Le propriétaire de la cible, déduit d'elle. RESTRICT : transféré ou fantôme. */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    protected Profile $owner;

    /** Qui a partagé : le propriétaire, ou une personne autorisée à modifier (repartage). */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    protected Profile $sharedBy;

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

    /**
     * Appelé par chaque sous-type APRÈS qu'il a fixé sa cible : le
     * propriétaire en est déduit.
     *
     * @param Share|null $grant pour un repartage : le partage EDIT qui y autorise
     */
    protected function __construct(Profile $sharedBy, ShareAudience $audience, AccessLevel $accessLevel, ?Share $grant = null)
    {
        if ($sharedBy->isGhost()) {
            throw new \LogicException('Le profil fantôme ne partage rien.');
        }
        if ($this->isTargetPersonal()) {
            throw new \LogicException('Un objet personnel ne se partage pas.');
        }
        // « Modifier » ne se donne qu'à des personnes nommées (décision du 30/09) ;
        // abonnés et lien sont donc forcément en lecture seule.
        if (AccessLevel::Edit === $accessLevel && ShareAudience::Specific !== $audience) {
            throw new \LogicException('Le droit de modifier ne se donne qu\'à des personnes choisies.');
        }

        $this->owner = $this->getTargetOwner();
        $this->sharedBy = $sharedBy;
        if (!$sharedBy->getId()->equals($this->owner->getId())) {
            $this->assertMayReshare($sharedBy, $accessLevel, $grant);
        }

        $this->id = Uuid::v7();
        $this->audience = $audience;
        $this->accessLevel = $accessLevel;
        $this->recipients = new ArrayCollection();
        if (ShareAudience::Link === $audience) {
            // 32 octets aléatoires en base64url : 43 caractères, impossible à deviner.
            $this->token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
        }
    }

    /**
     * Repartager ce qui n'est pas à soi : seulement avec un partage EDIT actif
     * sur la MÊME cible, dont on est destinataire nommé — et seulement en
     * lecture : seul le propriétaire donne le droit de modifier.
     */
    private function assertMayReshare(Profile $sharedBy, AccessLevel $accessLevel, ?Share $grant): void
    {
        if (AccessLevel::Read !== $accessLevel) {
            throw new \LogicException('Seul le propriétaire donne le droit de modifier.');
        }
        if (null === $grant
            || !$grant->isActive()
            || AccessLevel::Edit !== $grant->getAccessLevel()
            || $grant::class !== static::class
            || !$grant->getTargetId()->equals($this->getTargetId())
            || !$grant->isRecipient($sharedBy)
        ) {
            throw new \LogicException('On ne partage que ce qu\'on possède, ou ce qu\'on a le droit de modifier.');
        }
    }

    /** Le propriétaire de la ressource partagée. */
    abstract public function getTargetOwner(): Profile;

    abstract public function getTargetId(): Uuid;

    /** Un objet personnel ne se partage jamais (décision du 30/09). */
    protected function isTargetPersonal(): bool
    {
        return false;
    }

    public function isRecipient(Profile $profile): bool
    {
        foreach ($this->recipients as $recipient) {
            if ($recipient->getProfile()->getId()->equals($profile->getId())) {
                return true;
            }
        }

        return false;
    }

    public function getSharedBy(): Profile
    {
        return $this->sharedBy;
    }

    /** Partagé par quelqu'un d'autre que le propriétaire (« repartagé par … »). */
    public function isReshare(): bool
    {
        return !$this->sharedBy->getId()->equals($this->owner->getId());
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
        if ($profile->getId()->equals($this->owner->getId()) || $profile->getId()->equals($this->sharedBy->getId())) {
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
