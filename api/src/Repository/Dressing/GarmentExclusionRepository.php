<?php

namespace App\Repository\Dressing;

use App\Entity\Dressing\GarmentExclusion;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<GarmentExclusion>
 */
class GarmentExclusionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, GarmentExclusion::class);
    }
}
