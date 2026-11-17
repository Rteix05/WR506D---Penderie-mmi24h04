<?php

namespace App\Repository\Moderation;

use App\Entity\Moderation\AiReview;
use App\Entity\Notification\Report;
use App\Entity\Sale\Dispute;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<AiReview>
 */
class AiReviewRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AiReview::class);
    }

    /** La dernière analyse d'un signalement ou d'un litige, celle qu'on affiche. */
    public function latestFor(Report|Dispute $subject): ?AiReview
    {
        return $this->findOneBy([$subject instanceof Report ? 'report' : 'dispute' => $subject], ['createdAt' => 'DESC', 'id' => 'DESC']);
    }

    /** @return list<AiReview> toutes les analyses, de la plus récente à la plus ancienne */
    public function historyOf(Report|Dispute $subject): array
    {
        return $this->findBy([$subject instanceof Report ? 'report' : 'dispute' => $subject], ['createdAt' => 'DESC', 'id' => 'DESC']);
    }
}
