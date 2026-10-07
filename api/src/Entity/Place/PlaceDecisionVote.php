<?php

namespace App\Entity\Place;

use App\Entity\Identity\Profile;
use App\Entity\Trait\TimestampableTrait;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/** Le oui ou le non d'un colocataire (ou de la personne invitée) à une décision commune. */
#[ORM\Entity]
#[ORM\HasLifecycleCallbacks]
#[ORM\UniqueConstraint(name: 'uniq_place_decision_vote', columns: ['decision_id', 'voter_id'])]
class PlaceDecisionVote
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: PlaceDecision::class, inversedBy: 'votes')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private PlaceDecision $decision;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $voter;

    #[ORM\Column]
    private bool $approval;

    /** @internal Par PlaceDecision::vote(). */
    public function __construct(PlaceDecision $decision, Profile $voter, bool $approval)
    {
        $this->id = Uuid::v7();
        $this->decision = $decision;
        $this->voter = $voter;
        $this->approval = $approval;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getDecision(): PlaceDecision
    {
        return $this->decision;
    }

    public function getVoter(): Profile
    {
        return $this->voter;
    }

    public function isApproval(): bool
    {
        return $this->approval;
    }
}
