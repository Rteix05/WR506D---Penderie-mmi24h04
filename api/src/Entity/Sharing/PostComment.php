<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Un commentaire sous une publication du fil. Refusé si la publication a
 * fermé ses commentaires (toujours le cas pour une audience FOLLOWERS).
 */
#[ORM\Entity]
class PostComment extends Comment
{
    #[ORM\ManyToOne(targetEntity: Post::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private Post $post;

    public function __construct(Profile $author, Post $post, string $body, ?Comment $parent = null)
    {
        if (!$post->isCommentsEnabled()) {
            throw new \LogicException('Cette publication n\'accepte pas de commentaires.');
        }
        $isAuthor = $author->getId()->equals($post->getAuthor()->getId());
        // Le commentaire mémorise le partage porté par la publication, sauf pour son auteur.
        parent::__construct($author, $body, $isAuthor ? null : $post->getShare(), $parent);
        $this->post = $post;
        $this->assertReplyOnSameTarget();
    }

    public function getPost(): Post
    {
        return $this->post;
    }

    public function getTargetId(): Uuid
    {
        return $this->post->getId();
    }
}
