<?php

namespace App\Entity\Relation;

use App\Entity\Identity\Profile;
use App\Entity\Trait\TimestampableTrait;
use App\Repository\Relation\FollowRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Uid\Uuid;

/**
 * L'abonnement : asymétrique, sans accord de la personne suivie.
 *
 * Suivre quelqu'un ne donne jamais accès à un contenu privé, et un
 * abonnement mutuel propose l'amitié sans jamais la créer. Un abonnement
 * ne se modifie pas : il existe, ou on le supprime.
 */
#[ORM\Entity(repositoryClass: FollowRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\UniqueConstraint(name: 'uniq_follow_pair', columns: ['follower_id', 'following_id'])]
#[ORM\Index(name: 'idx_follow_following', columns: ['following_id'])]
#[UniqueEntity(fields: ['follower', 'following'], message: 'Tu suis déjà ce profil.')]
class Follow
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $follower;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $following;

    public function __construct(Profile $follower, Profile $following)
    {
        if ($follower === $following || $follower->getId()->equals($following->getId())) {
            throw new \LogicException('Un profil ne peut pas se suivre lui-même.');
        }
        if ($follower->isGhost() || $following->isGhost()) {
            throw new \LogicException('Le profil fantôme n\'a pas de relations.');
        }

        $this->id = Uuid::v7();
        $this->follower = $follower;
        $this->following = $following;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getFollower(): Profile
    {
        return $this->follower;
    }

    public function getFollowing(): Profile
    {
        return $this->following;
    }
}
