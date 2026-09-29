<?php

namespace App\Entity\Sharing;

use App\Entity\Media\Media;
use App\Repository\Sharing\PostMediaRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Une image d'une publication. Clé primaire composite (publication, média).
 */
#[ORM\Entity(repositoryClass: PostMediaRepository::class)]
#[ORM\Index(name: 'idx_post_media_order', columns: ['post_id', 'position'])]
class PostMedia
{
    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Post::class, inversedBy: 'media')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Post $post;

    /** RESTRICT : un fichier encore affiché ne se supprime pas (MDD). */
    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Media::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Media $media;

    #[ORM\Column]
    private int $position;

    public function __construct(Post $post, Media $media, int $position = 0)
    {
        $this->post = $post;
        $this->media = $media;
        $this->position = $position;
        $post->attachMedia($this);
    }

    public function getPost(): Post
    {
        return $this->post;
    }

    public function getMedia(): Media
    {
        return $this->media;
    }

    public function getPosition(): int
    {
        return $this->position;
    }
}
