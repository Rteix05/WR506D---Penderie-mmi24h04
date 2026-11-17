<?php

namespace App\Controller\Admin;

use App\Entity\Identity\Account;
use App\Entity\Moderation\AiReview;
use App\Entity\Notification\Report;
use App\Entity\Sale\Dispute;
use App\Enum\Moderation\AiReviewStatus;
use App\Service\Moderation\Ai\AiModerator;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;

/**
 * Journal de la modération IA : chaque pré-analyse (appliquée, proposée,
 * en échec), et ce que les administrateurs en ont fait. Depuis le détail
 * d'un signalement ou d'un litige : lancer l'analyse, valider une décision
 * de l'IA, ou l'annuler. Les gestes sont des POST avec jeton CSRF.
 */
#[Route('/admin/journal/ia')]
final class AiReviewController extends AbstractController
{
    private const PER_PAGE = 25;
    private const FILTERS = [
        'all' => null,
        'applied' => [AiReviewStatus::Applied],
        'proposed' => [AiReviewStatus::Proposed],
        'settled' => [AiReviewStatus::Confirmed, AiReviewStatus::Overridden],
        'reverted' => [AiReviewStatus::Reverted],
        'failed' => [AiReviewStatus::Failed],
    ];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly AiModerator $ai,
    ) {
    }

    #[Route('', name: 'admin_ai_log', methods: ['GET'])]
    public function index(Request $request): Response
    {
        $filter = \array_key_exists((string) $request->query->get('filter'), self::FILTERS) ? (string) $request->query->get('filter') : 'all';
        $page = max(1, $request->query->getInt('page', 1));

        $qb = $this->em->createQueryBuilder()->from(AiReview::class, 'r');
        if (null !== self::FILTERS[$filter]) {
            $qb->where('r.status IN (:st)')->setParameter('st', self::FILTERS[$filter]);
        }
        $total = (int) (clone $qb)->select('COUNT(r.id)')->getQuery()->getSingleScalarResult();
        $rows = $qb->select('r')->orderBy('r.createdAt', 'DESC')->addOrderBy('r.id', 'DESC')
            ->setFirstResult(($page - 1) * self::PER_PAGE)->setMaxResults(self::PER_PAGE)
            ->getQuery()->getResult();

        return $this->render('admin/journal/ai.html.twig', [
            'filter' => $filter,
            'page' => $page,
            'perPage' => self::PER_PAGE,
            'total' => $total,
            'rows' => $rows,
            'stats' => $this->stats(),
            'threshold' => $this->ai->threshold(),
        ]);
    }

    #[Route('/{id}', name: 'admin_ai_review', methods: ['GET'], requirements: ['id' => Requirement::UUID])]
    public function show(string $id): Response
    {
        $review = $this->review($id);
        $json = static fn (?array $data) => null === $data ? null : json_encode($data, \JSON_PRETTY_PRINT | \JSON_UNESCAPED_UNICODE | \JSON_UNESCAPED_SLASHES);

        return $this->render('admin/journal/ai_review.html.twig', [
            'review' => $review,
            'inputJson' => $json($review->getInput()),
            'answerJson' => $json($review->getAnswer()),
            'threshold' => $this->ai->threshold(),
        ]);
    }

    #[Route('/signalement/{id}', name: 'admin_ai_review_report', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function reviewReport(string $id, Request $request): Response
    {
        $report = $this->em->find(Report::class, $id) ?? throw $this->createNotFoundException('Signalement introuvable.');
        if ($this->checked($request, 'ai-report-'.$id)) {
            if (!$report->getStatus()->isPending()) {
                $this->addFlash('error', 'Ce signalement est déjà traité.');
            } else {
                $this->flashResult($this->ai->review($report, $this->admin()));
            }
        }

        return $this->redirectToRoute('admin_report', ['id' => $id]);
    }

    #[Route('/litige/{id}', name: 'admin_ai_review_dispute', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function reviewDispute(string $id, Request $request): Response
    {
        $dispute = $this->em->find(Dispute::class, $id) ?? throw $this->createNotFoundException('Litige introuvable.');
        if ($this->checked($request, 'ai-dispute-'.$id)) {
            $this->flashResult($this->ai->review($dispute, $this->admin()));
        }

        return $this->redirectToRoute('admin_dispute', ['id' => $id]);
    }

    #[Route('/{id}/valider', name: 'admin_ai_review_confirm', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function confirm(string $id, Request $request): Response
    {
        $review = $this->review($id);
        if ($this->checked($request, 'ai-review-'.$id)) {
            try {
                $this->ai->confirm($review, $this->admin());
                $this->addFlash('success', 'Décision de l\'IA validée.');
            } catch (\DomainException $e) {
                $this->addFlash('error', $e->getMessage());
            }
        }

        return $this->back($review, $request);
    }

    #[Route('/{id}/annuler', name: 'admin_ai_review_revert', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function revert(string $id, Request $request): Response
    {
        $review = $this->review($id);
        if ($this->checked($request, 'ai-review-'.$id)) {
            try {
                $this->ai->revert($review, $this->admin(), (string) $request->request->get('note', ''));
                $this->addFlash('success', 'Décision de l\'IA annulée : le signalement est rouvert à ton nom.');
            } catch (\DomainException $e) {
                $this->addFlash('error', $e->getMessage());
            }
        }

        return $this->back($review, $request);
    }

    /**
     * Les chiffres des 30 derniers jours : combien d'analyses, combien
     * appliquées seules, et surtout combien les administrateurs ont
     * contredites ou annulées — le vrai taux d'erreur de l'IA.
     *
     * @return array<string, int|null>
     */
    private function stats(): array
    {
        $rows = $this->em->createQueryBuilder()
            ->select('r.status AS status, COUNT(r.id) AS n, AVG(r.durationMs) AS ms')->from(AiReview::class, 'r')
            ->where('r.createdAt >= :since')->setParameter('since', new \DateTimeImmutable('-30 days'))
            ->groupBy('r.status')->getQuery()->getArrayResult();
        $by = [];
        $total = 0;
        $ms = 0.0;
        foreach ($rows as $row) {
            $status = $row['status'] instanceof AiReviewStatus ? $row['status']->value : (string) $row['status'];
            $by[$status] = (int) $row['n'];
            $total += (int) $row['n'];
            $ms += (float) $row['ms'] * (int) $row['n'];
        }
        $judged = ($by['CONFIRMED'] ?? 0) + ($by['OVERRIDDEN'] ?? 0) + ($by['REVERTED'] ?? 0);

        return [
            'total' => $total,
            'applied' => ($by['APPLIED'] ?? 0),
            'proposed' => ($by['PROPOSED'] ?? 0),
            'confirmed' => ($by['CONFIRMED'] ?? 0),
            'overridden' => ($by['OVERRIDDEN'] ?? 0),
            'reverted' => ($by['REVERTED'] ?? 0),
            'failed' => ($by['FAILED'] ?? 0),
            'agreement' => 0 === $judged ? null : (int) round(100 * ($by['CONFIRMED'] ?? 0) / $judged),
            'avgMs' => 0 === $total ? null : (int) round($ms / $total),
        ];
    }

    private function flashResult(AiReview $review): void
    {
        match ($review->getStatus()) {
            AiReviewStatus::Applied => $this->addFlash('success', 'L\'IA a appliqué sa décision : tu peux la valider ou l\'annuler.'),
            AiReviewStatus::Proposed => $this->addFlash('success', 'L\'IA a rendu son analyse : à toi de décider.'),
            default => $this->addFlash('error', 'L\'analyse IA a échoué : le détail est dans le journal.'),
        };
    }

    private function back(AiReview $review, Request $request): Response
    {
        if ('journal' === $request->request->get('from')) {
            return $this->redirectToRoute('admin_ai_review', ['id' => $review->getId()]);
        }
        if (null !== $review->getReport()) {
            return $this->redirectToRoute('admin_report', ['id' => $review->getReport()->getId()]);
        }
        if (null !== $review->getDispute()) {
            return $this->redirectToRoute('admin_dispute', ['id' => $review->getDispute()->getId()]);
        }

        return $this->redirectToRoute('admin_ai_review', ['id' => $review->getId()]);
    }

    private function review(string $id): AiReview
    {
        return $this->em->find(AiReview::class, $id) ?? throw $this->createNotFoundException('Analyse introuvable.');
    }

    private function admin(): Account
    {
        $admin = $this->getUser();
        \assert($admin instanceof Account);

        return $admin;
    }

    private function checked(Request $request, string $tokenId): bool
    {
        if ($this->isCsrfTokenValid($tokenId, (string) $request->request->get('_token'))) {
            return true;
        }
        $this->addFlash('error', 'La page a expiré : recharge-la et réessaie.');

        return false;
    }
}
