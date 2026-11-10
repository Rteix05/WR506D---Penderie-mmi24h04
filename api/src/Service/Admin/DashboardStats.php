<?php

namespace App\Service\Admin;

use App\Entity\Identity\Account;
use App\Entity\Inventory\Scan;
use App\Entity\Loan\Loan;
use App\Entity\Notification\Report;
use App\Entity\Sale\Dispute;
use App\Entity\Sale\Order;
use App\Enum\Inventory\ScanStatus;
use App\Enum\Loan\LoanStatus;
use App\Enum\Notification\ReportStatus;
use App\Enum\Sale\DisputeStatus;
use App\Enum\Sale\OrderStatus;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;

/**
 * Les chiffres du tableau de bord du back-office (maquette « Admin —
 * Tableau de bord ») : des requêtes agrégées (COUNT, SUM), jamais une
 * liste d'entités chargée pour être comptée.
 *
 * Les deux indicateurs du milieu suivent la demande du client (09/11) : le
 * scan, fonctionnalité clé, et les prêts. Signalements et litiges restent
 * dans le menu et dans « À traiter en priorité ».
 */
final class DashboardStats
{
    /** Une vente compte dès qu'elle est payée (ou remise en main propre), tant qu'elle n'est ni annulée ni remboursée. */
    private const REASONS = ['SPAM' => 'spam', 'INAPPROPRIATE' => 'contenu inapproprié', 'COUNTERFEIT' => 'contrefaçon', 'HARASSMENT' => 'harcèlement', 'OTHER' => 'autre motif'];

    private const SOLD =[OrderStatus::Paid, OrderStatus::Shipped, OrderStatus::Delivered, OrderStatus::Completed];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ClockInterface $clock,
    ) {
    }

    /**
     * Les comptes (hors profil fantôme), et ceux créés ces 7 derniers jours.
     *
     * @return array{total: int, thisWeek: int}
     */
    public function accounts(): array
    {
        $ghost = Account::GHOST_ID;
        $total = (int) $this->em->createQueryBuilder()
            ->select('COUNT(a.id)')->from(Account::class, 'a')
            ->where('a.id != :ghost')->setParameter('ghost', $ghost)
            ->getQuery()->getSingleScalarResult();
        $thisWeek = (int) $this->em->createQueryBuilder()
            ->select('COUNT(a.id)')->from(Account::class, 'a')
            ->where('a.id != :ghost')->andWhere('a.createdAt >= :since')
            ->setParameter('ghost', $ghost)->setParameter('since', $this->daysAgo(6))
            ->getQuery()->getSingleScalarResult();

        return ['total' => $total, 'thisWeek' => $thisWeek];
    }

    /**
     * La fiabilité du scan sur 30 jours (part des scans entièrement
     * reconnus ; null sans aucun scan), et les échecs des 7 derniers jours.
     *
     * @return array{rate: int|null, scans: int, failedThisWeek: int}
     */
    public function scans(): array
    {
        $rows = $this->em->createQueryBuilder()
            ->select('s.status AS status, COUNT(s.id) AS n')->from(Scan::class, 's')
            ->where('s.createdAt >= :since')->setParameter('since', $this->daysAgo(29))
            ->groupBy('s.status')
            ->getQuery()->getArrayResult();
        $byStatus = [];
        foreach ($rows as $row) {
            $status = $row['status'] instanceof ScanStatus ? $row['status'] : ScanStatus::from($row['status']);
            $byStatus[$status->value] = (int) $row['n'];
        }
        $scans = array_sum($byStatus);
        $failedThisWeek = (int) $this->em->createQueryBuilder()
            ->select('COUNT(s.id)')->from(Scan::class, 's')
            ->where('s.status = :failed')->andWhere('s.createdAt >= :since')
            ->setParameter('failed', ScanStatus::Failed)->setParameter('since', $this->daysAgo(6))
            ->getQuery()->getSingleScalarResult();

        return [
            'rate' => 0 === $scans ? null : (int) round(100 * ($byStatus[ScanStatus::Success->value] ?? 0) / $scans),
            'scans' => $scans,
            'failedThisWeek' => $failedThisWeek,
        ];
    }

    /**
     * Les prêts en cours (l'objet est chez l'emprunteur), et ceux en retard
     * (date de retour passée : le retard est dérivé, jamais stocké).
     *
     * @return array{active: int, overdue: int}
     */
    public function loans(): array
    {
        $active = $this->em->createQueryBuilder()
            ->select('COUNT(l.id)')->from(Loan::class, 'l')
            ->where('l.status = :active')->setParameter('active', LoanStatus::Active);
        $overdue = (clone $active)
            ->andWhere('l.dueDate < :today')->setParameter('today', $this->today(), 'date_immutable');

        return [
            'active' => (int) $active->getQuery()->getSingleScalarResult(),
            'overdue' => (int) $overdue->getQuery()->getSingleScalarResult(),
        ];
    }

    /**
     * Les ventes du mois en cours : leur nombre et le montant encaissé.
     *
     * @return array{count: int, amount: string}
     */
    public function salesThisMonth(): array
    {
        $row = $this->em->createQueryBuilder()
            ->select('COUNT(o.id) AS n, COALESCE(SUM(o.totalAmount), 0) AS amount')->from(Order::class, 'o')
            ->where('o.status IN (:sold)')->andWhere('o.createdAt >= :month')
            ->setParameter('sold', self::SOLD)
            ->setParameter('month', $this->today()->modify('first day of this month'))
            ->getQuery()->getSingleResult();

        return ['count' => (int) $row['n'], 'amount' => (string) $row['amount']];
    }

    /**
     * Les nouveaux comptes des 7 derniers jours, jour par jour, du plus
     * ancien à aujourd'hui.
     *
     * @return list<array{date: \DateTimeImmutable, count: int}>
     */
    public function signupsLastWeek(): array
    {
        $created = $this->em->createQueryBuilder()
            ->select('a.createdAt AS createdAt')->from(Account::class, 'a')
            ->where('a.id != :ghost')->andWhere('a.createdAt >= :since')
            ->setParameter('ghost', Account::GHOST_ID)->setParameter('since', $this->daysAgo(6))
            ->getQuery()->getArrayResult();
        $perDay = [];
        foreach ($created as $row) {
            $day = $row['createdAt']->format('Y-m-d');
            $perDay[$day] = ($perDay[$day] ?? 0) + 1;
        }
        $days = [];
        for ($i = 6; $i >= 0; --$i) {
            $date = $this->daysAgo($i);
            $days[] = ['date' => $date, 'count' => $perDay[$date->format('Y-m-d')] ?? 0];
        }

        return $days;
    }

    /**
     * « À traiter en priorité » : les signalements à traiter d'abord, puis
     * les litiges ouverts (les plus anciens en tête), puis les prêts les
     * plus en retard.
     *
     * @return list<array{kind: 'report'|'dispute'|'loan', title: string, detail: string, since: ?\DateTimeImmutable, id?: string}>
     */
    public function priorities(int $limit = 3): array
    {
        /** @var list<Report> $reports */
        $reports = $this->em->createQueryBuilder()
            ->select('r')->from(Report::class, 'r')
            ->where('r.status = :open')->setParameter('open', ReportStatus::Open)
            ->orderBy('r.createdAt', 'ASC')->setMaxResults($limit)
            ->getQuery()->getResult();
        $types = ['PROFILE' => 'Profil', 'ITEM' => 'Objet', 'GARMENT' => 'Vêtement', 'COMMENT' => 'Commentaire', 'LISTING' => 'Annonce', 'COLLECTION' => 'Collection', 'POST' => 'Publication'];
        $items = array_map(static fn (Report $r) => [
            'kind' => 'report',
            'title' => $types[$r->getTargetType()->value].' signalé',
            'detail' => 'par '.$r->getReporter()->getDisplayName().' · '.self::REASONS[$r->getReason()->value],
            'since' => $r->getCreatedAt(),
            'id' => (string) $r->getId(),
        ], $reports);

        if (\count($items) < $limit) {
            /** @var list<Dispute> $disputes */
            $disputes = $this->em->createQueryBuilder()
                ->select('d')->from(Dispute::class, 'd')
                ->where('d.status IN (:open)')->setParameter('open', [DisputeStatus::Open, DisputeStatus::UnderReview])
                ->orderBy('d.createdAt', 'ASC')->setMaxResults($limit - \count($items))
                ->getQuery()->getResult();
            foreach ($disputes as $d) {
                $items[] = [
                    'kind' => 'dispute',
                    'title' => 'Litige #'.$d->getOrder()->getReference(),
                    'detail' => \sprintf('%s · %s €', $d->getOrder()->getListing()->getPossession()->getName(), self::euros($d->getOrder()->getTotalAmount())),
                    'since' => $d->getCreatedAt(),
                    'id' => (string) $d->getId(),
                ];
            }
        }

        if (\count($items) < $limit) {
            /** @var list<Loan> $late */
            $late = $this->em->createQueryBuilder()
                ->select('l')->from(Loan::class, 'l')
                ->where('l.status = :active')->andWhere('l.dueDate < :today')
                ->setParameter('active', LoanStatus::Active)->setParameter('today', $this->today(), 'date_immutable')
                ->orderBy('l.dueDate', 'ASC')->setMaxResults($limit - \count($items))
                ->getQuery()->getResult();
            foreach ($late as $loan) {
                $items[] = [
                    'kind' => 'loan',
                    'title' => 'Prêt en retard',
                    'detail' => \sprintf('« %s » · %s → %s · prévu le %s', $loan->getPossession()->getName(), $loan->getLender()->getDisplayName(), $loan->getBorrower()->getDisplayName(), $loan->getDueDate()?->format('d/m') ?? ''),
                    'since' => $loan->getDueDate() ?? $loan->getRequestedAt(),
                ];
            }
        }

        return $items;
    }

    /** Les signalements pas encore traités (pastille du menu). */
    public function openReports(): int
    {
        return $this->em->getRepository(Report::class)->count(['status' => [ReportStatus::Open, ReportStatus::UnderReview]]);
    }

    /** Les litiges ouverts (pastille du menu). */
    public function openDisputes(): int
    {
        return (int) $this->em->createQueryBuilder()
            ->select('COUNT(d.id)')->from(Dispute::class, 'd')
            ->where('d.status IN (:open)')->setParameter('open', [DisputeStatus::Open, DisputeStatus::UnderReview])
            ->getQuery()->getSingleScalarResult();
    }

    /**
     * Les dernières commandes, de la plus récente à la plus ancienne.
     *
     * @return list<Order>
     */
    public function latestOrders(int $limit = 3): array
    {
        /** @var list<Order> */
        return $this->em->getRepository(Order::class)->findBy([], ['createdAt' => 'DESC'], $limit);
    }

    /** « 38 520 » : un montant decimal en euros, sans centimes nuls, espaces fines des milliers. */
    public static function euros(string $amount): string
    {
        $value = (float) $amount;
        $decimals = fmod($value, 1.0) === 0.0 ? 0 : 2;

        return number_format($value, $decimals, ',', "\u{202F}");
    }

    private function today(): \DateTimeImmutable
    {
        return $this->clock->now()->setTime(0, 0);
    }

    private function daysAgo(int $days): \DateTimeImmutable
    {
        return $this->today()->modify(\sprintf('-%d days', $days));
    }
}
