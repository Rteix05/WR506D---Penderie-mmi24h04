<?php

namespace App\Repository\Inventory;

use App\Entity\Inventory\GarmentMedia;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<GarmentMedia>
 */
class GarmentMediaRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, GarmentMedia::class);
    }
}
