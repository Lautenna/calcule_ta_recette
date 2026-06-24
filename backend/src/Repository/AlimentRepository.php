<?php

namespace App\Repository;

use App\Entity\Aliment;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class AlimentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Aliment::class);
    }

    /**
     * @return array<int, Aliment> indexé par ciqualCode, pour un upsert efficace à l'import
     */
    public function findAllIndexedByCiqualCode(): array
    {
        $result = [];
        foreach ($this->findAll() as $aliment) {
            $result[$aliment->getCiqualCode()] = $aliment;
        }
        return $result;
    }
}
