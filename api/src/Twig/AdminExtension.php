<?php

namespace App\Twig;

use App\Service\Admin\DashboardStats;
use Symfony\Contracts\Translation\TranslatorInterface;
use Twig\Extension\AbstractExtension;
use Twig\TwigFilter;
use Twig\TwigFunction;

/**
 * Filtres et fonctions des gabarits du back-office, dans la langue de la
 * page (AdminLocaleSubscriber).
 *
 *   {{ order.totalAmount|admin_euros }} €   →   « 38 520 », « 12,50 » (« 38,520 », « 12.50 » en anglais et en japonais)
 *   {{ date|admin_date }}                   →   « 12 mars 2026 », « 12 March 2026 », « 2026年3月12日 »
 *   {{ admin_open_disputes() }}             →   la pastille « Litiges » du menu
 *   {{ admin_open_reports() }}              →   la pastille « Signalements »
 *   {% set reasons = admin_labels('report_reasons') %}
 */
final class AdminExtension extends AbstractExtension
{
    /**
     * Les libellés partagés par plusieurs gabarits (un include ne transmet
     * pas ses variables) : des clés du domaine admin (labels.<jeu>.<valeur>),
     * et une couleur de pastille pour les statuts.
     */
    private const LABELS = [
        'report_reasons' => ['SPAM', 'INAPPROPRIATE', 'COUNTERFEIT', 'HARASSMENT', 'OTHER'],
        'report_types' => ['PROFILE', 'ITEM', 'GARMENT', 'COMMENT', 'LISTING', 'COLLECTION', 'POST'],
        'report_status' => ['OPEN' => 'red', 'UNDER_REVIEW' => 'pink', 'ACTIONED' => 'green', 'DISMISSED' => 'grey'],
    ];

    /** Les formats de date de chaque langue (motifs ICU). */
    private const DATE_FORMATS = [
        'fr' => ['d MMMM y', "d MMMM y 'à' H 'h' mm"],
        'en' => ['d MMMM y', "d MMMM y 'at' HH:mm"],
        'ja' => ['y年M月d日', 'y年M月d日 H:mm'],
    ];

    public function __construct(
        private readonly DashboardStats $stats,
        private readonly TranslatorInterface $translator,
    ) {
    }

    public function getFilters(): array
    {
        return [
            new TwigFilter('admin_euros', fn (string $amount): string => DashboardStats::euros($amount, $this->translator->getLocale())),
            new TwigFilter('admin_date', fn (?\DateTimeInterface $date, bool $time = false): string => self::date($date, $time, $this->translator->getLocale())),
        ];
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction('admin_open_disputes', $this->stats->openDisputes(...)),
            new TwigFunction('admin_open_reports', $this->stats->openReports(...)),
            new TwigFunction('admin_labels', $this->labels(...)),
        ];
    }

    /**
     * Un jeu de libellés traduits : [valeur => libellé], ou pour les
     * statuts [valeur => [libellé, couleur]].
     *
     * @return array<string, string|array{0: string, 1: string}>
     */
    public function labels(string $set): array
    {
        $labels = [];
        foreach (self::LABELS[$set] ?? [] as $key => $value) {
            $code = \is_int($key) ? $value : $key;
            $label = $this->translator->trans("labels.$set.$code", [], 'admin');
            $labels[$code] = \is_int($key) ? $label : [$label, $value];
        }

        return $labels;
    }

    /** « 12 mars 2026 », ou « 12 mars 2026 à 9 h 12 » avec l'heure (selon la langue). */
    public static function date(?\DateTimeInterface $date, bool $time = false, string $locale = 'fr'): string
    {
        if (null === $date) {
            return '—';
        }
        $pattern = (self::DATE_FORMATS[$locale] ?? self::DATE_FORMATS['fr'])[$time ? 1 : 0];
        $format = new \IntlDateFormatter($locale, \IntlDateFormatter::NONE, \IntlDateFormatter::NONE, null, null, $pattern);

        return (string) $format->format($date);
    }
}
