<?php

namespace App\Twig;

use App\Service\Admin\DashboardStats;
use Twig\Extension\AbstractExtension;
use Twig\TwigFilter;
use Twig\TwigFunction;

/**
 * Filtres et fonctions des gabarits du back-office.
 *
 *   {{ order.totalAmount|admin_euros }} €   →   « 38 520 », « 12,50 »
 *   {{ date|admin_date }}                   →   « 12 mars 2026 »
 *   {{ admin_open_disputes() }}             →   la pastille « Litiges » du menu
 */
final class AdminExtension extends AbstractExtension
{
    public function __construct(private readonly DashboardStats $stats)
    {
    }

    public function getFilters(): array
    {
        return [
            new TwigFilter('admin_euros', DashboardStats::euros(...)),
            new TwigFilter('admin_date', self::date(...)),
        ];
    }

    public function getFunctions(): array
    {
        return [new TwigFunction('admin_open_disputes', $this->stats->openDisputes(...))];
    }

    /** « 12 mars 2026 », ou « 12 mars 2026 à 9 h 12 » avec l'heure. */
    public static function date(?\DateTimeInterface $date, bool $time = false): string
    {
        if (null === $date) {
            return '—';
        }
        $format = new \IntlDateFormatter('fr_FR', \IntlDateFormatter::NONE, \IntlDateFormatter::NONE, null, null, $time ? "d MMMM y 'à' H 'h' mm" : 'd MMMM y');

        return (string) $format->format($date);
    }
}
