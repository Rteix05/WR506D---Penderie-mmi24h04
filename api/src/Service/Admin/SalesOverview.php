<?php

namespace App\Service\Admin;

use App\Entity\Sale\Dispute;
use App\Entity\Sale\Order;
use App\Entity\Sale\Payment;
use App\Entity\Sale\Refund;
use App\Enum\Sale\DisputeStatus;
use App\Enum\Sale\OrderStatus;
use App\Enum\Sale\PaymentDirection;
use App\Enum\Sale\PaymentStatus;
use App\Enum\Sale\RefundStatus;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;
use Psr\Clock\ClockInterface;

/**
 * Ventes et transactions (maquette « Admin — Ventes et transactions ») :
 * les chiffres du mois et la liste des commandes. L'administration
 * consulte ; elle ne manipule jamais d'argent (les paiements passent par
 * le prestataire, voir Payment).
 */
final class SalesOverview
{
    public const PER_PAGE = 20;

    /** Toutes, payées, en livraison, remboursées, en litige. */
    public const FILTERS = ['all', 'paid', 'shipping', 'refunded', 'disputed'];

    private const SOLD = [OrderStatus::Paid, OrderStatus::Shipped, OrderStatus::Delivered, OrderStatus::Completed];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ClockInterface $clock,
    ) {
    }

    /**
     * @return array{count: int, volume: string, paymentRate: float|null, paymentsFailed: int, refunds: int}
     */
    public function thisMonth(): array
    {
        $month = $this->clock->now()->setTime(0, 0)->modify('first day of this month');
        $sold = $this->em->createQueryBuilder()
            ->select('COUNT(o.id) AS n, COALESCE(SUM(o.totalAmount), 0) AS volume')->from(Order::class, 'o')
            ->where('o.status IN (:sold)')->andWhere('o.createdAt >= :month')
            ->setParameter('sold', self::SOLD)->setParameter('month', $month)
            ->getQuery()->getSingleResult();
        $payments = $this->em->createQueryBuilder()
            ->select('p.status AS status, COUNT(p.id) AS n')->from(Payment::class, 'p')
            ->where('p.direction = :charge')->andWhere('p.createdAt >= :month')
            ->setParameter('charge', PaymentDirection::Charge)->setParameter('month', $month)
            ->groupBy('p.status')->getQuery()->getArrayResult();
        $byStatus = [];
        foreach ($payments as $row) {
            $status = $row['status'] instanceof PaymentStatus ? $row['status'] : PaymentStatus::from($row['status']);
            $byStatus[$status->value] = (int) $row['n'];
        }
        $captured = $byStatus[PaymentStatus::Captured->value] ?? 0;
        $failed = $byStatus[PaymentStatus::Failed->value] ?? 0;
        $refunds = (int) $this->em->createQueryBuilder()
            ->select('COUNT(r.id)')->from(Refund::class, 'r')
            ->where('r.status = :ok')->andWhere('r.createdAt >= :month')
            ->setParameter('ok', RefundStatus::Succeeded)->setParameter('month', $month)
            ->getQuery()->getSingleScalarResult();

        return [
            'count' => (int) $sold['n'],
            'volume' => (string) $sold['volume'],
            'paymentRate' => 0 === $captured + $failed ? null : (int) round(1000 * $captured / ($captured + $failed)) / 10,
            'paymentsFailed' => $failed,
            'refunds' => $refunds,
        ];
    }

    /**
     * @return array{rows: list<Order>, total: int}
     */
    public function orders(string $filter, string $reference, int $page): array
    {
        $qb = $this->filtered($filter, $reference);
        $total = (int) (clone $qb)->select('COUNT(o.id)')->getQuery()->getSingleScalarResult();

        /** @var list<Order> $rows */
        $rows = $qb->select('o')->orderBy('o.createdAt', 'DESC')
            ->setFirstResult(($page - 1) * self::PER_PAGE)->setMaxResults(self::PER_PAGE)
            ->getQuery()->getResult();

        return ['rows' => $rows, 'total' => $total];
    }

    private function filtered(string $filter, string $reference): QueryBuilder
    {
        $qb = $this->em->createQueryBuilder()->from(Order::class, 'o');
        if ('' !== trim($reference)) {
            $qb->andWhere('UPPER(o.reference) LIKE :ref')->setParameter('ref', '%'.mb_strtoupper(ltrim(trim($reference), '#')).'%');
        }
        match ($filter) {
            'paid' => $qb->andWhere('o.status IN (:statuses)')->setParameter('statuses', [OrderStatus::Paid, OrderStatus::Completed]),
            'shipping' => $qb->andWhere('o.status IN (:statuses)')->setParameter('statuses', [OrderStatus::Shipped, OrderStatus::Delivered]),
            'refunded' => $qb->andWhere('o.status = :status')->setParameter('status', OrderStatus::Refunded),
            'disputed' => $qb->andWhere(\sprintf('EXISTS (SELECT 1 FROM %s d WHERE d.order = o AND d.status IN (:open))', Dispute::class))
                ->setParameter('open', [DisputeStatus::Open, DisputeStatus::UnderReview]),
            default => null,
        };

        return $qb;
    }
}
