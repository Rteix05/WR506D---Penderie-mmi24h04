<?php

namespace App\Repository\Loan;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Loan\Loan;
use App\Enum\Loan\LoanStatus;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Loan>
 */
class LoanRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Loan::class);
    }

    /**
     * Les prêts d'un profil, comme prêteur ou comme emprunteur, du plus
     * récent au plus ancien.
     *
     * @param 'lender'|'borrower'|null $role nul : les deux
     * @param bool|null                $open nul : tous ; vrai : demandés, acceptés ou en cours ; faux : terminés
     *
     * @return list<Loan>
     */
    public function forProfile(Profile $profile, ?string $role = null, ?bool $open = null): array
    {
        $qb = $this->createQueryBuilder('l')
            ->orderBy('l.requestedAt', 'DESC')
            ->setMaxResults(200)
            ->setParameter('me', $profile->getId(), 'uuid');
        match ($role) {
            'lender' => $qb->where('l.lender = :me'),
            'borrower' => $qb->where('l.borrower = :me'),
            default => $qb->where('l.lender = :me OR l.borrower = :me'),
        };
        $this->filterOpen($qb, $open);

        /** @var list<Loan> */
        return $qb->getQuery()->getResult();
    }

    /**
     * L'historique des prêts d'un objet, du plus récent au plus ancien.
     *
     * @return list<Loan>
     */
    public function forPossession(Item|Garment $possession, ?bool $open = null): array
    {
        $qb = $this->createQueryBuilder('l')
            ->where($possession instanceof Item ? 'l.item = :p' : 'l.garment = :p')
            ->setParameter('p', $possession->getId(), 'uuid')
            ->orderBy('l.requestedAt', 'DESC');
        $this->filterOpen($qb, $open);

        /** @var list<Loan> */
        return $qb->getQuery()->getResult();
    }

    /** Le prêt en cours (l'objet est chez quelqu'un), s'il y en a un. */
    public function activeOn(Item|Garment $possession): ?Loan
    {
        return $this->findOneBy([$possession instanceof Item ? 'item' : 'garment' => $possession, 'status' => LoanStatus::Active]);
    }

    private function filterOpen(QueryBuilder $qb, ?bool $open): void
    {
        if (null === $open) {
            return;
        }
        $statuses = array_values(array_filter(LoanStatus::cases(), static fn (LoanStatus $s) => $s->isOpen() === $open));
        $qb->andWhere('l.status IN (:statuses)')->setParameter('statuses', array_map(static fn (LoanStatus $s) => $s->value, $statuses));
    }
}
