<?php

namespace App\Controller\Admin;

use App\Entity\Identity\Account;
use App\Entity\Notification\ModerationAction;
use App\Entity\Notification\Report;
use App\Enum\Notification\ReportStatus;
use App\Service\Moderation\ReportDesk;
use App\Service\Moderation\ReportTargets;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;

/**
 * Signalements (maquettes « Admin — Signalements » et « Détail d'un
 * signalement ») : trois onglets (objets, contenus, commentaires), trois
 * états (à traiter, en cours, traités), et la décision sur chaque
 * signalement (ReportDesk). Les gestes sont des POST avec jeton CSRF.
 */
#[Route('/admin/signalements')]
final class ReportController extends AbstractController
{
    private const PER_PAGE = 20;
    private const STATES = [
        'open' => [ReportStatus::Open],
        'review' => [ReportStatus::UnderReview],
        'handled' => [ReportStatus::Actioned, ReportStatus::Dismissed],
    ];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ReportTargets $targets,
        private readonly ReportDesk $desk,
    ) {
    }

    #[Route('', name: 'admin_reports', methods: ['GET'])]
    public function index(Request $request): Response
    {
        $group = \array_key_exists((string) $request->query->get('group'), ReportTargets::GROUPS) ? (string) $request->query->get('group') : 'objects';
        $state = \array_key_exists((string) $request->query->get('filter'), self::STATES) ? (string) $request->query->get('filter') : 'open';
        $page = max(1, $request->query->getInt('page', 1));

        $qb = $this->em->createQueryBuilder()->from(Report::class, 'r')
            ->where('r.targetType IN (:types)')->andWhere('r.status IN (:states)')
            ->setParameter('types', ReportTargets::GROUPS[$group])->setParameter('states', self::STATES[$state]);
        $total = (int) (clone $qb)->select('COUNT(r.id)')->getQuery()->getSingleScalarResult();
        /** @var list<Report> $reports */
        $reports = $qb->select('r')->orderBy('r.createdAt', 'open' === $state ? 'ASC' : 'DESC')->addOrderBy('r.id', 'ASC')
            ->setFirstResult(($page - 1) * self::PER_PAGE)->setMaxResults(self::PER_PAGE)
            ->getQuery()->getResult();

        $pending = [];
        foreach (ReportTargets::GROUPS as $key => $types) {
            $pending[$key] = $this->em->getRepository(Report::class)->count(['targetType' => $types, 'status' => [ReportStatus::Open, ReportStatus::UnderReview]]);
        }

        return $this->render('admin/reports/index.html.twig', [
            'group' => $group,
            'state' => $state,
            'page' => $page,
            'perPage' => self::PER_PAGE,
            'total' => $total,
            'pending' => $pending,
            'rows' => array_map(fn (Report $r) => ['report' => $r] + $this->describe($r), $reports),
        ]);
    }

    #[Route('/{id}', name: 'admin_report', methods: ['GET'], requirements: ['id' => Requirement::UUID])]
    public function show(string $id): Response
    {
        $report = $this->report($id);
        $target = $this->targets->find($report->getTargetType(), (string) $report->getTargetId());

        return $this->render('admin/reports/show.html.twig', [
            'report' => $report,
            'canHide' => null !== $target && ReportTargets::canHide($target),
            'hideLabel' => ReportTargets::hideLabel($report->getTargetType()),
            'actions' => $this->em->getRepository(ModerationAction::class)->findBy(['report' => $report], ['createdAt' => 'ASC', 'id' => 'ASC']),
            // Les autres signalements sur ce même contenu.
            'others' => $this->em->getRepository(Report::class)->count(['targetType' => $report->getTargetType(), 'targetId' => $report->getTargetId()]) - 1,
        ] + $this->describe($report));
    }

    #[Route('/{id}/prendre-en-charge', name: 'admin_report_take', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function take(string $id, Request $request): Response
    {
        $report = $this->report($id);
        if ($this->checked($request, $id) && ReportStatus::Open === $report->getStatus()) {
            $report->takeInCharge($this->admin());
            $this->em->flush();
            $this->addFlash('success', 'Signalement pris en charge.');
        }

        return $this->redirectToRoute('admin_report', ['id' => $id]);
    }

    #[Route('/{id}/decision', name: 'admin_report_decide', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function decide(string $id, Request $request): Response
    {
        $report = $this->report($id);
        if ($this->checked($request, $id)) {
            $decision = (string) $request->request->get('decision');
            try {
                if (!\in_array($decision, ReportDesk::DECISIONS, true)) {
                    throw new \DomainException('Choisis une décision.');
                }
                $this->desk->decide($report, $this->admin(), $decision, (string) $request->request->get('note', ''));
                $this->addFlash('success', 'Décision appliquée et inscrite au journal.');
            } catch (\DomainException $e) {
                $this->addFlash('error', $e->getMessage());
            }
        }

        return $this->redirectToRoute('admin_report', ['id' => $id]);
    }

    /**
     * Le contenu signalé tel que l'administrateur le lit : libellé, auteur,
     * et s'il existe encore.
     *
     * @return array{target: object|null, label: string, author: \App\Entity\Identity\Profile|null}
     */
    private function describe(Report $report): array
    {
        $target = $this->targets->find($report->getTargetType(), (string) $report->getTargetId());

        return [
            'target' => $target,
            'label' => null === $target ? 'Contenu supprimé' : ReportTargets::labelOf($target),
            'author' => null === $target ? null : ReportTargets::authorOf($target),
        ];
    }

    private function report(string $id): Report
    {
        return $this->em->find(Report::class, $id) ?? throw $this->createNotFoundException('Signalement introuvable.');
    }

    private function admin(): Account
    {
        $admin = $this->getUser();
        \assert($admin instanceof Account);

        return $admin;
    }

    private function checked(Request $request, string $id): bool
    {
        if ($this->isCsrfTokenValid('report-'.$id, (string) $request->request->get('_token'))) {
            return true;
        }
        $this->addFlash('error', 'La page a expiré : recharge-la et réessaie.');

        return false;
    }
}
