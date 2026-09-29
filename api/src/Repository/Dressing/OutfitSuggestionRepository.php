<?php

namespace App\Repository\Dressing;

use App\Entity\Dressing\OutfitSuggestion;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<OutfitSuggestion>
 */
class OutfitSuggestionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, OutfitSuggestion::class);
    }
}
