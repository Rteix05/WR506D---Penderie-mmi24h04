<?php

namespace App\Entity\Place;

use App\Entity\Identity\Profile;
use App\Entity\Trait\TimestampableTrait;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Un occupant du logement, admin au même titre que les autres (colocation,
 * décision du 30/09). Le créateur du logement en est le premier membre ;
 * un logement d'une seule personne a donc un seul membre.
 *
 * Être membre ne donne AUCUN droit sur les affaires des autres : on voit
 * ce qui est rangé dans les pièces communes, on modifie directement les
 * pièces communes et leurs rangements, jamais les objets d'autrui.
 */
#[ORM\Entity]
#[ORM\HasLifecycleCallbacks]
#[ORM\UniqueConstraint(name: 'uniq_place_member', columns: ['place_id', 'profile_id'])]
#[ORM\Index(name: 'idx_place_member_profile', columns: ['profile_id'])]
class PlaceMember
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Place::class, inversedBy: 'members')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Place $place;

    /** CASCADE : un profil supprimé quitte ses logements (ProfileDeleter transfère d'abord au tuteur). */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $profile;

    /** @internal Par Place::addMember(). */
    public function __construct(Place $place, Profile $profile)
    {
        $this->id = Uuid::v7();
        $this->place = $place;
        $this->profile = $profile;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getPlace(): Place
    {
        return $this->place;
    }

    public function getProfile(): Profile
    {
        return $this->profile;
    }

    public function getJoinedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }
}
