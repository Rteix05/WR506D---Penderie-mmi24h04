<?php

namespace App\Repository\Dressing;

use App\Entity\Dressing\OutfitSuggestionGarment;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<OutfitSuggestionGarment>
 */
class OutfitSuggestionGarmentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, OutfitSuggestionGarment::class);
    }
}
