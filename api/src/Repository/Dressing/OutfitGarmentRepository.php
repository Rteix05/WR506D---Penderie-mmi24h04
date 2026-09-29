<?php

namespace App\Repository\Dressing;

use App\Entity\Dressing\OutfitGarment;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<OutfitGarment>
 */
class OutfitGarmentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, OutfitGarment::class);
    }
}
