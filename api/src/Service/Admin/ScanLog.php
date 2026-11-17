<?php

namespace App\Service\Admin;

use App\Entity\Inventory\Scan;
use App\Enum\Inventory\ScanKind;
use App\Enum\Inventory\ScanStatus;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;
use Psr\Clock\ClockInterface;

/**
 * Le journal des scans du back-office : les scans analysés par l'IA (photo,
 * étiquette), leurs échecs, et de quoi comprendre pourquoi — temps de
 * chargement, modèle qui a répondu, modèles qui ont échoué et leur erreur.
 *
 * Les durées viennent de Scan.durationMs (toute la chaîne de modèles, côté
 * serveur) ; le détail par modèle, de rawData.attempts (modèle, erreur, code
 * HTTP, ms) et rawData.model / modelMs pour celui qui a répondu.
 */
final class ScanLog
{
    public const PERIODS = [1, 7, 30, 90];
    public const FILTERS = ['failed', 'partial', 'all'];

    /** Au-delà, les statistiques par modèle se calculent sur les plus récents. */
    private const STATS_SAMPLE = 3000;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ClockInterface $clock,
    ) {
    }

    public function since(int $days): \DateTimeImmutable
    {
        return $this->clock->now()->modify(\sprintf('-%d days', $days));
    }

    /** @return array{0: list<Scan>, 1: int} la page demandée et le total */
    public function page(string $filter, ?ScanKind $kind, ?string $model, int $days, int $page, int $perPage): array
    {
        $qb = $this->base($kind, $days);
        match ($filter) {
            'failed' => $qb->andWhere('s.status = :st')->setParameter('st', ScanStatus::Failed),
            'partial' => $qb->andWhere('s.status = :st')->setParameter('st', ScanStatus::Partial),
            default => null,
        };
        if (null !== $model && '' !== $model) {
            // Le modèle a répondu, ou figure parmi ceux qui ont échoué (JSONB, en SQL natif).
            $ids = $this->em->getConnection()->fetchFirstColumn(
                "SELECT id FROM scan WHERE created_at >= :since AND (raw_data->>'model' = :m OR EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(raw_data->'attempts', '[]'::jsonb)) a WHERE a->>'model' = :m))",
                ['since' => $this->since($days)->format('Y-m-d H:i:s'), 'm' => $model],
            );
            $qb->andWhere('s.id IN (:ids)')->setParameter('ids', [] === $ids ? ['00000000-0000-0000-0000-000000000000'] : $ids);
        }
        $total = (int) (clone $qb)->select('COUNT(s.id)')->getQuery()->getSingleScalarResult();
        /** @var list<Scan> $rows */
        $rows = $qb->select('s', 'p')->join('s.profile', 'p')
            ->orderBy('s.createdAt', 'DESC')->addOrderBy('s.id', 'DESC')
            ->setFirstResult(($page - 1) * $perPage)->setMaxResults($perPage)
            ->getQuery()->getResult();

        return [$rows, $total];
    }

    /**
     * Les chiffres en tête du journal : volume, part d'échecs, temps moyen et
     * 95e centile, et, par modèle, combien de fois il a répondu ou échoué.
     *
     * @return array<string, mixed>
     */
    public function stats(?ScanKind $kind, int $days): array
    {
        $since = $this->since($days)->format('Y-m-d H:i:s');
        $where = 'created_at >= :since AND provider IS NOT NULL'.(null === $kind ? '' : ' AND kind = :kind');
        $params = ['since' => $since] + (null === $kind ? [] : ['kind' => $kind->value]);
        $conn = $this->em->getConnection();

        $row = $conn->fetchAssociative(
            "SELECT COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE status = 'FAILED') AS failed,
                    COUNT(*) FILTER (WHERE status = 'PARTIAL') AS partial,
                    ROUND(AVG(duration_ms)) AS avg_ms,
                    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms,
                    MAX(duration_ms) AS max_ms
               FROM scan WHERE {$where}",
            $params,
        ) ?: [];

        $models = [];
        $errors = [];
        $raws = $conn->fetchFirstColumn("SELECT raw_data FROM scan WHERE {$where} ORDER BY created_at DESC LIMIT ".self::STATS_SAMPLE, $params);
        foreach ($raws as $json) {
            $raw = \is_string($json) ? json_decode($json, true) : null;
            if (!\is_array($raw)) {
                continue;
            }
            foreach ((array) ($raw['attempts'] ?? []) as $attempt) {
                $name = (string) ($attempt['model'] ?? '?');
                $models[$name] ??= ['ok' => 0, 'failed' => 0, 'ms' => []];
                ++$models[$name]['failed'];
                $category = self::category((string) ($attempt['error'] ?? ''));
                $errors[$category] = ($errors[$category] ?? 0) + 1;
                if (($attempt['ms'] ?? 0) > 0) {
                    $models[$name]['ms'][] = (int) $attempt['ms'];
                }
            }
            if (\is_string($raw['model'] ?? null)) {
                $models[$raw['model']] ??= ['ok' => 0, 'failed' => 0, 'ms' => []];
                ++$models[$raw['model']]['ok'];
                if (($raw['modelMs'] ?? 0) > 0) {
                    $models[$raw['model']]['ms'][] = (int) $raw['modelMs'];
                }
            }
        }
        foreach ($models as $name => $m) {
            $calls = $m['ok'] + $m['failed'];
            $models[$name] = [
                'model' => $name,
                'ok' => $m['ok'],
                'failed' => $m['failed'],
                'failureRate' => 0 === $calls ? null : (int) round(100 * $m['failed'] / $calls),
                'avgMs' => [] === $m['ms'] ? null : (int) round(array_sum($m['ms']) / \count($m['ms'])),
            ];
        }
        usort($models, static fn (array $a, array $b) => [$b['failed'], $b['ok']] <=> [$a['failed'], $a['ok']]);
        arsort($errors);

        $total = (int) ($row['total'] ?? 0);

        return [
            'total' => $total,
            'failed' => (int) ($row['failed'] ?? 0),
            'partial' => (int) ($row['partial'] ?? 0),
            'failureRate' => 0 === $total ? null : (int) round(100 * (int) $row['failed'] / $total),
            'avgMs' => null === ($row['avg_ms'] ?? null) ? null : (int) $row['avg_ms'],
            'p95Ms' => null === ($row['p95_ms'] ?? null) ? null : (int) round((float) $row['p95_ms']),
            'maxMs' => null === ($row['max_ms'] ?? null) ? null : (int) $row['max_ms'],
            'models' => $models,
            'errors' => $errors,
        ];
    }

    /**
     * La famille d'une erreur, pour les regrouper : quota, modèle retiré,
     * panne du prestataire, délai, réponse illisible, clé refusée…
     */
    public static function category(string $error): string
    {
        return match (true) {
            str_contains($error, '429') => 'quota',
            str_contains($error, '401') => 'key',
            str_contains($error, '404') => 'gone',
            1 === preg_match('/HTTP 5\d\d/', $error) => 'provider',
            str_contains($error, 'délai'), str_contains($error, 'timeout'), str_contains($error, 'timed out'), str_contains($error, 'duration') => 'timeout',
            str_contains($error, 'transport') => 'network',
            str_contains($error, 'JSON'), str_contains($error, 'sans contenu') => 'unreadable',
            str_contains($error, 'minimum attendu') => 'nothing',
            default => 'other',
        };
    }

    /** @return list<string> les modèles vus dans la période, pour le filtre */
    public function models(int $days): array
    {
        return $this->em->getConnection()->fetchFirstColumn(
            "SELECT DISTINCT m FROM (
                SELECT raw_data->>'model' AS m FROM scan WHERE created_at >= :since
                UNION SELECT a->>'model' FROM scan, jsonb_array_elements(COALESCE(raw_data->'attempts', '[]'::jsonb)) a WHERE created_at >= :since
             ) x WHERE m IS NOT NULL ORDER BY m",
            ['since' => $this->since($days)->format('Y-m-d H:i:s')],
        );
    }

    private function base(?ScanKind $kind, int $days): QueryBuilder
    {
        // Seuls les scans passés par l'IA (provider renseigné) : le code-barres et le QR se décodent dans l'app.
        $qb = $this->em->createQueryBuilder()->from(Scan::class, 's')
            ->where('s.createdAt >= :since')->andWhere('s.provider IS NOT NULL')
            ->setParameter('since', $this->since($days));
        if (null !== $kind) {
            $qb->andWhere('s.kind = :kind')->setParameter('kind', $kind);
        }

        return $qb;
    }
}
