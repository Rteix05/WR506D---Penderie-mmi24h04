<?php

namespace App\Service\Admin;

use App\Entity\Identity\Account;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Inventory\Scan;
use App\Entity\Loan\Loan;
use App\Entity\Notification\Report;
use App\Entity\Sale\Dispute;
use App\Entity\Sale\Order;
use App\Enum\Inventory\ScanStatus;
use App\Enum\Loan\LoanStatus;
use App\Enum\Notification\ReportStatus;
use App\Enum\Sale\DisputeStatus;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;
use Symfony\Contracts\Translation\TranslatorInterface;

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
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ClockInterface $clock,
        private readonly TranslatorInterface $translator,
    ) {
    }

    /**
     * Les comptes actifs : ceux qui ont utilisé l'app ces 30 derniers jours
     * (Account::lastSeenAt), sur le total ; et les nouveaux comptes de la
     * semaine, comparés à la semaine précédente. L'activité passée n'est pas
     * historisée (on ne garde que le dernier jour) : pas de comparaison des
     * actifs eux-mêmes.
     *
     * @return array{active: int, total: int, thisWeek: int, lastWeek: int}
     */
    public function accounts(): array
    {
        /** @param array<string, \DateTimeImmutable> $params */
        $count = function (?string $where = null, array $params = []): int {
            $qb = $this->em->createQueryBuilder()
                ->select('COUNT(a.id)')->from(Account::class, 'a')
                ->where('a.id NOT IN (:system)')->setParameter('system', Account::SYSTEM_IDS);
            if (null !== $where) {
                $qb->andWhere($where);
            }
            foreach ($params as $name => $value) {
                $qb->setParameter($name, $value);
            }

            return (int) $qb->getQuery()->getSingleScalarResult();
        };

        return [
            'active' => $count('a.lastSeenAt >= :since', ['since' => $this->daysAgo(29)]),
            'total' => $count(),
            'thisWeek' => $count('a.createdAt >= :since', ['since' => $this->daysAgo(6)]),
            'lastWeek' => $count('a.createdAt >= :from AND a.createdAt < :to', ['from' => $this->daysAgo(13), 'to' => $this->daysAgo(6)]),
        ];
    }

    /**
     * La fiabilité du scan sur les 30 derniers jours (part des scans
     * entièrement reconnus ; null sans aucun scan), comparée aux 30 jours
     * d'avant, et les échecs des 7 derniers jours.
     *
     * @return array{rate: int|null, previousRate: int|null, scans: int, failedThisWeek: int}
     */
    public function scans(): array
    {
        [$rate, $scans] = $this->scanRate($this->daysAgo(29), null);
        [$previousRate] = $this->scanRate($this->daysAgo(59), $this->daysAgo(29));
        $failedThisWeek = (int) $this->em->createQueryBuilder()
            ->select('COUNT(s.id)')->from(Scan::class, 's')
            ->where('s.status = :failed')->andWhere('s.createdAt >= :since')
            ->setParameter('failed', ScanStatus::Failed)->setParameter('since', $this->daysAgo(6))
            ->getQuery()->getSingleScalarResult();

        return ['rate' => $rate, 'previousRate' => $previousRate, 'scans' => $scans, 'failedThisWeek' => $failedThisWeek];
    }

    /**
     * Les prêts en cours (l'objet est chez l'emprunteur), ceux en retard
     * (date de retour passée : le retard est dérivé, jamais stocké), et les
     * prêts remis ce mois-ci comparés au mois précédent.
     *
     * @return array{active: int, overdue: int, thisMonth: int, lastMonth: int}
     */
    public function loans(): array
    {
        $active = $this->em->createQueryBuilder()
            ->select('COUNT(l.id)')->from(Loan::class, 'l')
            ->where('l.status = :active')->setParameter('active', LoanStatus::Active);
        $overdue = (clone $active)
            ->andWhere('l.dueDate < :today')->setParameter('today', $this->today(), 'date_immutable');
        $month = $this->today()->modify('first day of this month');
        $started = fn (\DateTimeImmutable $from, \DateTimeImmutable $to) => (int) $this->em->createQueryBuilder()
            ->select('COUNT(l.id)')->from(Loan::class, 'l')
            ->where('l.receivedAt >= :from')->andWhere('l.receivedAt < :to')
            ->setParameter('from', $from)->setParameter('to', $to)
            ->getQuery()->getSingleScalarResult();

        return [
            'active' => (int) $active->getQuery()->getSingleScalarResult(),
            'overdue' => (int) $overdue->getQuery()->getSingleScalarResult(),
            'thisMonth' => $started($month, $month->modify('first day of next month')),
            'lastMonth' => $started($month->modify('first day of last month'), $month),
        ];
    }

    /**
     * Objets et vêtements ajoutés à l'inventaire ces 7 derniers jours,
     * comparés à la semaine précédente : la carte qui dit si l'app sert
     * (l'inventaire est le cœur de Penderie), à la place des ventes tant que
     * la vente n'est pas lancée. Les ventes ont leur écran.
     *
     * @return array{thisWeek: int, lastWeek: int, total: int}
     */
    public function possessions(): array
    {
        $count = function (?\DateTimeImmutable $from, ?\DateTimeImmutable $to): int {
            $n = 0;
            foreach ([Item::class, Garment::class] as $class) {
                $qb = $this->em->createQueryBuilder()->select('COUNT(x.id)')->from($class, 'x')->where('x.deletedAt IS NULL');
                if (null !== $from) {
                    $qb->andWhere('x.createdAt >= :from')->setParameter('from', $from);
                }
                if (null !== $to) {
                    $qb->andWhere('x.createdAt < :to')->setParameter('to', $to);
                }
                $n += (int) $qb->getQuery()->getSingleScalarResult();
            }

            return $n;
        };

        return [
            'thisWeek' => $count($this->daysAgo(6), null),
            'lastWeek' => $count($this->daysAgo(13), $this->daysAgo(6)),
            'total' => $count(null, null),
        ];
    }

    /**
     * @return array{0: int|null, 1: int} la part des scans réussis entre deux dates, et leur nombre
     */
    private function scanRate(\DateTimeImmutable $from, ?\DateTimeImmutable $to): array
    {
        $qb = $this->em->createQueryBuilder()
            ->select('s.status AS status, COUNT(s.id) AS n')->from(Scan::class, 's')
            ->where('s.createdAt >= :from')->setParameter('from', $from)
            ->groupBy('s.status');
        if (null !== $to) {
            $qb->andWhere('s.createdAt < :to')->setParameter('to', $to);
        }
        $byStatus = [];
        foreach ($qb->getQuery()->getArrayResult() as $row) {
            $status = $row['status'] instanceof ScanStatus ? $row['status'] : ScanStatus::from($row['status']);
            $byStatus[$status->value] = (int) $row['n'];
        }
        $scans = array_sum($byStatus);

        return [0 === $scans ? null : (int) round(100 * ($byStatus[ScanStatus::Success->value] ?? 0) / $scans), $scans];
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
            ->where('a.id NOT IN (:system)')->andWhere('a.createdAt >= :since')
            ->setParameter('system', Account::SYSTEM_IDS)->setParameter('since', $this->daysAgo(6))
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
        // Les textes dans la langue de la page (domaine admin, dashboard.priority.*).
        $t = fn (string $key, array $params = []): string => $this->translator->trans("dashboard.priority.$key", $params, 'admin');
        $items = array_map(fn (Report $r) => [
            'kind' => 'report',
            'title' => $t('report.'.$r->getTargetType()->value),
            'detail' => $t('reportDetail', ['name' => $r->getReporter()->getDisplayName(), 'reason' => $t('reason.'.$r->getReason()->value)]),
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
                    'title' => $t('dispute', ['reference' => $d->getOrder()->getReference()]),
                    'detail' => \sprintf('%s · %s €', $d->getOrder()->getListing()->getPossession()->getName(), self::euros($d->getOrder()->getTotalAmount(), $this->translator->getLocale())),
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
                    'title' => $t('loan'),
                    'detail' => $t('loanDetail', [
                        'name' => $loan->getPossession()->getName(),
                        'lender' => $loan->getLender()->getDisplayName(),
                        'borrower' => $loan->getBorrower()->getDisplayName(),
                        'due' => $loan->getDueDate() ?? new \DateTimeImmutable(),
                    ]),
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

    /**
     * Un montant en euros, sans centimes nuls : « 38 520 », « 12,50 » en
     * français (espaces fines des milliers) ; « 38,520 », « 12.50 » en
     * anglais et en japonais.
     */
    public static function euros(string $amount, string $locale = 'fr'): string
    {
        $value = (float) $amount;
        $decimals = fmod($value, 1.0) === 0.0 ? 0 : 2;

        return 'fr' === $locale
            ? number_format($value, $decimals, ',', "\u{202F}")
            : number_format($value, $decimals, '.', ',');
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
