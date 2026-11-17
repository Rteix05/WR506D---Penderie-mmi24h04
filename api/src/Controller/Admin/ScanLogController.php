<?php

namespace App\Controller\Admin;

use App\Entity\Inventory\Scan;
use App\Enum\Inventory\ScanKind;
use App\Service\Admin\ScanLog;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;

/**
 * Journal des scans : les scans en échec (ou partiels, ou tous), avec le
 * temps de chargement, le modèle qui a répondu, ceux qui ont échoué et
 * pourquoi. En tête, les chiffres de la période et le bilan par modèle.
 */
#[Route('/admin/journal/scans')]
final class ScanLogController extends AbstractController
{
    private const PER_PAGE = 25;

    public function __construct(
        private readonly ScanLog $log,
        private readonly EntityManagerInterface $em,
    ) {
    }

    #[Route('', name: 'admin_scan_log', methods: ['GET'])]
    public function index(Request $request): Response
    {
        $filter = \in_array($request->query->get('filter'), ScanLog::FILTERS, true) ? (string) $request->query->get('filter') : 'failed';
        $days = \in_array($request->query->getInt('days'), ScanLog::PERIODS, true) ? $request->query->getInt('days') : 7;
        $kind = ScanKind::tryFrom((string) $request->query->get('kind'));
        $kind = \in_array($kind, [ScanKind::Photo, ScanKind::LabelOcr], true) ? $kind : null;
        $model = trim((string) $request->query->get('model', ''));
        $page = max(1, $request->query->getInt('page', 1));
        [$rows, $total] = $this->log->page($filter, $kind, $model, $days, $page, self::PER_PAGE);

        return $this->render('admin/journal/scans.html.twig', [
            'filter' => $filter,
            'days' => $days,
            'kind' => $kind?->value,
            'model' => $model,
            'page' => $page,
            'perPage' => self::PER_PAGE,
            'total' => $total,
            'rows' => $rows,
            'stats' => $this->log->stats($kind, $days),
            'models' => $this->log->models($days),
            'periods' => ScanLog::PERIODS,
        ]);
    }

    #[Route('/{id}', name: 'admin_scan_log_show', methods: ['GET'], requirements: ['id' => Requirement::UUID])]
    public function show(string $id): Response
    {
        $scan = $this->em->find(Scan::class, $id) ?? throw $this->createNotFoundException('Scan introuvable.');
        $raw = $scan->getRawData() ?? [];

        return $this->render('admin/journal/scan.html.twig', [
            'scan' => $scan,
            'raw' => $raw,
            'attempts' => array_map(static fn (array $a) => $a + ['category' => ScanLog::category((string) ($a['error'] ?? ''))], (array) ($raw['attempts'] ?? [])),
            'answerJson' => isset($raw['answer']) ? json_encode($raw['answer'], \JSON_PRETTY_PRINT | \JSON_UNESCAPED_UNICODE | \JSON_UNESCAPED_SLASHES) : null,
        ]);
    }
}
