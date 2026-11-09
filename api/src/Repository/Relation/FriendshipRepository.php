<?php

namespace App\Repository\Relation;

use App\Entity\Identity\Profile;
use App\Entity\Relation\Friendship;
use App\Enum\Relation\FriendshipStatus;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Friendship>
 */
class FriendshipRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Friendship::class);
    }

    /** La ligne de la paire, quel que soit le sens de la demande. */
    public function findBetween(Profile $a, Profile $b): ?Friendship
    {
        return $this->createQueryBuilder('f')
            ->where('(f.requester = :a AND f.addressee = :b) OR (f.requester = :b AND f.addressee = :a)')
            ->setParameter('a', $a->getId(), 'uuid')
            ->setParameter('b', $b->getId(), 'uuid')
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function areFriends(Profile $a, Profile $b): bool
    {
        return FriendshipStatus::Accepted === $this->findBetween($a, $b)?->getStatus();
    }

    /**
     * Les amis acceptés, quel que soit le sens de la demande.
     *
     * @return list<Profile>
     */
    public function friendsOf(Profile $me): array
    {
        /** @var list<Friendship> $friendships */
        $friendships = $this->createQueryBuilder('f')
            ->where('f.requester = :me OR f.addressee = :me')
            ->andWhere('f.status = :accepted')
            ->setParameter('me', $me->getId(), 'uuid')
            ->setParameter('accepted', FriendshipStatus::Accepted)
            ->getQuery()->getResult();

        return array_map(static fn (Friendship $f) => $f->getRequester()->getId()->equals($me->getId()) ? $f->getAddressee() : $f->getRequester(), $friendships);
    }
}
