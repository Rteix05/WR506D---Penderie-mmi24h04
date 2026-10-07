<?php

namespace App\Repository\Dressing;

use App\Entity\Dressing\GarmentVisibilityPreference;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<GarmentVisibilityPreference>
 */
class GarmentVisibilityPreferenceRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, GarmentVisibilityPreference::class);
    }
}
