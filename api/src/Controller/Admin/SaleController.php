<?php

namespace App\Controller\Admin;

use App\Service\Admin\SalesOverview;
use Psr\Clock\ClockInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Ventes et transactions (maquette « Admin — Ventes et transactions ») :
 * chiffres du mois, filtres, recherche par numéro de commande. En lecture
 * seule : l'administration consulte, elle ne manipule jamais d'argent.
 */
final class SaleController extends AbstractController
{
    public function __construct(
        private readonly SalesOverview $sales,
        private readonly ClockInterface $clock,
    ) {
    }

    #[Route('/admin/ventes', name: 'admin_sales', methods: ['GET'])]
    public function __invoke(Request $request): Response
    {
        $filter = \in_array($request->query->get('filter'), SalesOverview::FILTERS, true) ? (string) $request->query->get('filter') : 'all';
        $query = trim((string) $request->query->get('q', ''));
        $page = max(1, $request->query->getInt('page', 1));
        $month = new \IntlDateFormatter('fr_FR', \IntlDateFormatter::NONE, \IntlDateFormatter::NONE, null, null, 'MMMM y');

        return $this->render('admin/sales/index.html.twig', [
            'filter' => $filter,
            'query' => $query,
            'page' => $page,
            'perPage' => SalesOverview::PER_PAGE,
            'month' => ucfirst((string) $month->format($this->clock->now())),
            'stats' => $this->sales->thisMonth(),
        ] + $this->sales->orders($filter, $query, $page));
    }
}
