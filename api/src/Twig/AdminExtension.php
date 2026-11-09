<?php

namespace App\Twig;

use App\Service\Admin\DashboardStats;
use Twig\Extension\AbstractExtension;
use Twig\TwigFilter;

/**
 * Filtres des gabarits du back-office.
 *
 *   {{ order.totalAmount|admin_euros }} €   →   « 38 520 », « 12,50 »
 */
final class AdminExtension extends AbstractExtension
{
    public function getFilters(): array
    {
        return [new TwigFilter('admin_euros', DashboardStats::euros(...))];
    }
}
