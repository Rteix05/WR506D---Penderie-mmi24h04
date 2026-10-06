<?php

namespace App\Entity\Place;

use App\Entity\Identity\Profile;
use App\Entity\Trait\TimestampableTrait;
use App\Enum\Place\PlaceDecisionKind;
use App\Enum\Place\PlaceDecisionStatus;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Une décision de colocation prise à l'UNANIMITÉ (décision du 30/09) :
 * faire entrer quelqu'un, supprimer le logement, supprimer une pièce
 * commune.
 *
 * Celui qui la demande vote oui d'office. Chaque autre membre vote ; pour
 * une invitation, la personne invitée aussi. Un seul « non » rejette. La
 * décision est appliquée (PlaceDecisions) quand le dernier « oui » arrive.
 * Les votants sont les membres AU MOMENT DU DÉCOMPTE : quelqu'un qui part
 * ne bloque plus, quelqu'un qui arrive doit voter.
 */
#[ORM\Entity]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_place_decision_place_status', columns: ['place_id', 'status'])]
class PlaceDecision
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Place::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Place $place;

    #[ORM\Column(length: 20, enumType: PlaceDecisionKind::class)]
    private PlaceDecisionKind $kind;

    #[ORM\Column(length: 20, enumType: PlaceDecisionStatus::class)]
    private PlaceDecisionStatus $status = PlaceDecisionStatus::Pending;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $requestedBy;

    /** INVITE_MEMBER : la personne invitée. */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Profile $invitee = null;

    /** DELETE_ROOM : la pièce commune à supprimer. */
    #[ORM\ManyToOne(targetEntity: Room::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Room $room = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $closedAt = null;

    /** @var Collection<int, PlaceDecisionVote> */
    #[ORM\OneToMany(targetEntity: PlaceDecisionVote::class, mappedBy: 'decision', cascade: ['persist'])]
    private Collection $votes;

    private function __construct(Place $place, PlaceDecisionKind $kind, Profile $requestedBy)
    {
        if (!$place->hasMember($requestedBy)) {
            throw new \LogicException('Seul un membre du logement demande une décision commune.');
        }
        $this->id = Uuid::v7();
        $this->place = $place;
        $this->kind = $kind;
        $this->requestedBy = $requestedBy;
        $this->votes = new ArrayCollection();
        $this->votes->add(new PlaceDecisionVote($this, $requestedBy, true));
    }

    public static function inviteMember(Place $place, Profile $requestedBy, Profile $invitee): self
    {
        if ($place->hasMember($invitee)) {
            throw new \LogicException('Cette personne fait déjà partie du logement.');
        }
        if ($invitee->isChild() || $invitee->isGhost()) {
            throw new \LogicException('On invite en colocation un profil adulte (un enfant vit avec son tuteur).');
        }
        $d = new self($place, PlaceDecisionKind::InviteMember, $requestedBy);
        $d->invitee = $invitee;

        return $d;
    }

    public static function deletePlace(Place $place, Profile $requestedBy): self
    {
        return new self($place, PlaceDecisionKind::DeletePlace, $requestedBy);
    }

    public static function deleteRoom(Room $room, Profile $requestedBy): self
    {
        if ($room->isClosed()) {
            throw new \LogicException('Une pièce fermée se supprime par celui qui l\'a créée, sans vote.');
        }
        $d = new self($room->getPlace(), PlaceDecisionKind::DeleteRoom, $requestedBy);
        $d->room = $room;

        return $d;
    }

    /**
     * Enregistre un vote. Renvoie vrai quand la décision vient d'être
     * APPROUVÉE (à appliquer par l'appelant, dans la même transaction).
     */
    public function vote(Profile $voter, bool $approve): bool
    {
        $this->assertPending();
        if (!$this->isVoter($voter)) {
            throw new \LogicException('Seuls les membres du logement (et la personne invitée) votent.');
        }
        if (null !== $this->voteOf($voter)) {
            throw new \LogicException('Tu as déjà voté.');
        }
        $this->votes->add(new PlaceDecisionVote($this, $voter, $approve));
        if (!$approve) {
            $this->close(PlaceDecisionStatus::Rejected);

            return false;
        }

        return $this->settle();
    }

    /** Recompte après un départ : si tous ceux qui restent ont dit oui, c'est approuvé. */
    public function settle(): bool
    {
        if (PlaceDecisionStatus::Pending !== $this->status) {
            return false;
        }
        foreach ($this->voters() as $voter) {
            if (true !== $this->voteOf($voter)?->isApproval()) {
                return false;
            }
        }
        $this->close(PlaceDecisionStatus::Approved);

        return true;
    }

    public function cancel(Profile $by): void
    {
        $this->assertPending();
        if (!$by->getId()->equals($this->requestedBy->getId())) {
            throw new \LogicException('Seul celui qui l\'a demandée retire une décision.');
        }
        $this->close(PlaceDecisionStatus::Cancelled);
    }

    /** @internal Quand la décision n'a plus d'objet (son auteur est parti). */
    public function drop(): void
    {
        $this->assertPending();
        $this->close(PlaceDecisionStatus::Cancelled);
    }

    /** @return list<Profile> les membres actuels, plus la personne invitée */
    public function voters(): array
    {
        $voters = $this->place->getMemberProfiles();
        if (null !== $this->invitee) {
            $voters[] = $this->invitee;
        }

        return $voters;
    }

    public function isVoter(Profile $profile): bool
    {
        foreach ($this->voters() as $voter) {
            if ($voter->getId()->equals($profile->getId())) {
                return true;
            }
        }

        return false;
    }

    public function voteOf(Profile $profile): ?PlaceDecisionVote
    {
        foreach ($this->votes as $vote) {
            if ($vote->getVoter()->getId()->equals($profile->getId())) {
                return $vote;
            }
        }

        return null;
    }

    private function assertPending(): void
    {
        if (PlaceDecisionStatus::Pending !== $this->status) {
            throw new \LogicException(\sprintf('Cette décision est déjà close (%s).', $this->status->value));
        }
    }

    private function close(PlaceDecisionStatus $status): void
    {
        $this->status = $status;
        $this->closedAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getPlace(): Place
    {
        return $this->place;
    }

    public function getKind(): PlaceDecisionKind
    {
        return $this->kind;
    }

    public function getStatus(): PlaceDecisionStatus
    {
        return $this->status;
    }

    public function getRequestedBy(): Profile
    {
        return $this->requestedBy;
    }

    public function getInvitee(): ?Profile
    {
        return $this->invitee;
    }

    public function getRoom(): ?Room
    {
        return $this->room;
    }

    public function getClosedAt(): ?\DateTimeImmutable
    {
        return $this->closedAt;
    }

    /** @return Collection<int, PlaceDecisionVote> */
    public function getVotes(): Collection
    {
        return $this->votes;
    }
}
