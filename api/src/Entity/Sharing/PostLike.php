<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use App\Repository\Sharing\PostLikeRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * « J'aime » sur une publication du fil (demandé le 17/11, hors MDD
 * initial). Un profil aime une publication au plus une fois : la clé est
 * le couple (publication, profil).
 *
 * Qui peut voir la publication peut l'aimer, abonnés compris (aimer n'est
 * pas commenter : la règle « abonnés = lecture seule » porte sur les
 * commentaires). Supprimer le profil ou la publication supprime ses
 * « j'aime » : ce sont des relations sociales, rien à conserver.
 */
#[ORM\Entity(repositoryClass: PostLikeRepository::class)]
#[ORM\Index(name: 'idx_post_like_profile', columns: ['profile_id'])]
class PostLike
{
    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Post::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Post $post;

    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $profile;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(Post $post, Profile $profile, ?\DateTimeImmutable $at = null)
    {
        $this->post = $post;
        $this->profile = $profile;
        $this->createdAt = $at ?? new \DateTimeImmutable();
    }

    public function getPost(): Post
    {
        return $this->post;
    }

    public function getProfile(): Profile
    {
        return $this->profile;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
