<?php

namespace App\Repository\Sharing;

use App\Entity\Identity\Profile;
use App\Entity\Sharing\Post;
use App\Entity\Sharing\PostComment;
use App\Entity\Sharing\PostLike;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<PostLike>
 */
class PostLikeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PostLike::class);
    }

    /**
     * Pour une page du fil, en trois requêtes : le nombre de « j'aime » et
     * de commentaires visibles de chaque publication, et celles que j'aime.
     *
     * @param list<Post> $posts
     *
     * @return array<string, array{likes: int, comments: int, liked: bool}>
     */
    public function countsFor(array $posts, Profile $me): array
    {
        $counts = [];
        foreach ($posts as $post) {
            $counts[(string) $post->getId()] = ['likes' => 0, 'comments' => 0, 'liked' => false];
        }
        if ([] === $posts) {
            return $counts;
        }
        $em = $this->getEntityManager();

        foreach ($em->createQueryBuilder()->select('IDENTITY(l.post) AS post', 'COUNT(l.profile) AS n')->from(PostLike::class, 'l')
            ->where('l.post IN (:posts)')->setParameter('posts', $posts)->groupBy('l.post')->getQuery()->getArrayResult() as $row) {
            $counts[(string) $row['post']]['likes'] = (int) $row['n'];
        }
        foreach ($em->createQueryBuilder()->select('IDENTITY(c.post) AS post', 'COUNT(c.id) AS n')->from(PostComment::class, 'c')
            ->where('c.post IN (:posts)')->andWhere('c.deletedAt IS NULL')->andWhere('c.hiddenAt IS NULL')
            ->setParameter('posts', $posts)->groupBy('c.post')->getQuery()->getArrayResult() as $row) {
            $counts[(string) $row['post']]['comments'] = (int) $row['n'];
        }
        foreach ($em->createQueryBuilder()->select('IDENTITY(l.post) AS post')->from(PostLike::class, 'l')
            ->where('l.post IN (:posts)')->andWhere('l.profile = :me')
            ->setParameter('posts', $posts)->setParameter('me', $me)->getQuery()->getArrayResult() as $row) {
            $counts[(string) $row['post']]['liked'] = true;
        }

        return $counts;
    }
}
