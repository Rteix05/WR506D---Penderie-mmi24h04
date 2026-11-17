<?php

namespace App\Controller\Admin;

use App\Service\Admin\DashboardStats;
use Psr\Clock\ClockInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Le tableau de bord du back-office (maquette « Admin — Tableau de bord ») :
 * quatre indicateurs, les nouveaux inscrits de la semaine, ce qui est à
 * traiter en priorité et les dernières transactions. Réservé à ROLE_ADMIN
 * (access_control).
 */
final class DashboardController extends AbstractController
{
    public function __construct(
        private readonly DashboardStats $stats,
        private readonly ClockInterface $clock,
    ) {
    }

    #[Route('/admin', name: 'admin_dashboard', methods: ['GET'])]
    public function __invoke(): Response
    {
        $today = new \IntlDateFormatter('fr_FR', \IntlDateFormatter::FULL, \IntlDateFormatter::NONE, null, null, 'EEEE d MMMM y');
        $days = $this->stats->signupsLastWeek();
        $weekday = new \IntlDateFormatter('fr_FR', \IntlDateFormatter::FULL, \IntlDateFormatter::NONE, null, null, 'EEEEE');

        return $this->render('admin/dashboard.html.twig', [
            'today' => ucfirst((string) $today->format($this->clock->now())),
            'accounts' => $this->stats->accounts(),
            'scans' => $this->stats->scans(),
            'loans' => $this->stats->loans(),
            'sales' => $this->stats->salesThisMonth(),
            'signups' => array_map(static fn (array $d) => $d + ['letter' => mb_strtoupper((string) $weekday->format($d['date']))], $days),
            'signupsMax' => max(1, ...array_column($days, 'count')),
            'priorities' => $this->stats->priorities(),
            'orders' => $this->stats->latestOrders(),
        ]);
    }
}
