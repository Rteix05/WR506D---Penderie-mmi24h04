<?php

namespace App\Controller\Admin;

use App\Entity\Identity\Account;
use App\Entity\Sale\Dispute;
use App\Entity\Sale\Refund;
use App\Enum\Sale\DisputeStatus;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;

/**
 * Litiges et remboursements (maquettes « Admin — Litiges et
 * remboursements » et « Détail d'un litige »).
 *
 * Le MDD : un litige « trace et escalade, il n'arbitre pas et ne déplace pas
 * d'argent ». L'administrateur prend le litige en charge, puis le clôt avec
 * sa décision écrite (Dispute::takeInCharge, Dispute::resolve). Un
 * remboursement, s'il est décidé, passe par le prestataire de paiement :
 * rien ici ne bouge d'argent.
 */
#[Route('/admin/litiges')]
final class DisputeController extends AbstractController
{
    private const PER_PAGE = 20;
    private const OPEN = [DisputeStatus::Open, DisputeStatus::UnderReview];

    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    #[Route('', name: 'admin_disputes', methods: ['GET'])]
    public function index(Request $request): Response
    {
        $tab = 'refunds' === $request->query->get('filter') ? 'refunds' : 'disputes';
        $query = trim((string) $request->query->get('q', ''));
        $page = max(1, $request->query->getInt('page', 1));
        $class = 'refunds' === $tab ? Refund::class : Dispute::class;

        $qb = $this->em->createQueryBuilder()->from($class, 'x')->join('x.order', 'o');
        if ('' !== $query) {
            $qb->andWhere('UPPER(o.reference) LIKE :ref')->setParameter('ref', '%'.mb_strtoupper(ltrim($query, '#')).'%');
        }
        $total = (int) (clone $qb)->select('COUNT(x.id)')->getQuery()->getSingleScalarResult();
        $rows = $qb->select('x')
            // Les litiges ouverts d'abord, les plus anciens en tête : ce qui attend le plus.
            ->addOrderBy('disputes' === $tab ? "CASE WHEN x.status IN ('OPEN', 'UNDER_REVIEW') THEN 0 ELSE 1 END" : 'x.createdAt', 'disputes' === $tab ? 'ASC' : 'DESC')
            ->addOrderBy('x.createdAt', 'disputes' === $tab ? 'ASC' : 'DESC')
            ->setFirstResult(($page - 1) * self::PER_PAGE)->setMaxResults(self::PER_PAGE)
            ->getQuery()->getResult();

        return $this->render('admin/disputes/index.html.twig', [
            'tab' => $tab,
            'query' => $query,
            'page' => $page,
            'perPage' => self::PER_PAGE,
            'rows' => $rows,
            'total' => $total,
            'openCount' => $this->em->getRepository(Dispute::class)->count(['status' => self::OPEN]),
            'refundCount' => $this->em->getRepository(Refund::class)->count([]),
        ]);
    }

    #[Route('/{id}', name: 'admin_dispute', methods: ['GET'], requirements: ['id' => Requirement::UUID])]
    public function show(string $id): Response
    {
        $dispute = $this->dispute($id);
        $order = $dispute->getOrder();
        $before = fn ($profile) => (int) $this->em->createQueryBuilder()
            ->select('COUNT(d.id)')->from(Dispute::class, 'd')->join('d.order', 'o')
            ->where('o.buyer = :p OR o.seller = :p')->andWhere('d.id != :self')
            ->setParameter('p', $profile)->setParameter('self', $dispute->getId(), 'uuid')
            ->getQuery()->getSingleScalarResult();

        return $this->render('admin/disputes/show.html.twig', [
            'dispute' => $dispute,
            'order' => $order,
            'open' => \in_array($dispute->getStatus(), self::OPEN, true),
            'buyerDisputes' => $before($order->getBuyer()),
            'sellerDisputes' => $before($order->getSeller()),
        ]);
    }

    /** Prendre en charge : le litige passe « en cours », à mon nom. */
    #[Route('/{id}/prendre-en-charge', name: 'admin_dispute_take', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function take(string $id, Request $request): Response
    {
        $dispute = $this->dispute($id);
        if ($this->checked($request, $id) && DisputeStatus::Open === $dispute->getStatus()) {
            $dispute->takeInCharge($this->admin());
            $this->em->flush();
            $this->addFlash('success', 'Litige pris en charge.');
        }

        return $this->redirectToRoute('admin_dispute', ['id' => $id]);
    }

    /**
     * Clore avec une décision écrite, en faveur de l'acheteur ou du vendeur
     * (RESOLVED), ou sans suite (CLOSED).
     */
    #[Route('/{id}/clore', name: 'admin_dispute_resolve', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function resolve(string $id, Request $request): Response
    {
        $dispute = $this->dispute($id);
        if (!$this->checked($request, $id)) {
            return $this->redirectToRoute('admin_dispute', ['id' => $id]);
        }
        if (!\in_array($dispute->getStatus(), self::OPEN, true)) {
            $this->addFlash('error', 'Ce litige est déjà clos.');

            return $this->redirectToRoute('admin_dispute', ['id' => $id]);
        }
        $outcome = (string) $request->request->get('outcome');
        $note = trim((string) $request->request->get('note', ''));
        $label = ['buyer' => 'En faveur de l\'acheteur', 'seller' => 'En faveur du vendeur', 'none' => 'Sans suite'][$outcome] ?? null;
        if (null === $label || '' === $note || mb_strlen($note) > 1000) {
            $this->addFlash('error', 'Choisis une décision et explique-la (1 000 caractères au plus) : les deux parties la liront.');

            return $this->redirectToRoute('admin_dispute', ['id' => $id]);
        }
        $dispute->resolve($this->admin(), $label.' : '.$note, closeOnly: 'none' === $outcome);
        $this->em->flush();
        $this->addFlash('success', 'Litige clos. '.('buyer' === $outcome ? 'Le remboursement se fait chez le prestataire de paiement.' : ''));

        return $this->redirectToRoute('admin_dispute', ['id' => $id]);
    }

    private function dispute(string $id): Dispute
    {
        return $this->em->find(Dispute::class, $id) ?? throw $this->createNotFoundException('Litige introuvable.');
    }

    private function admin(): Account
    {
        $admin = $this->getUser();
        \assert($admin instanceof Account);

        return $admin;
    }

    private function checked(Request $request, string $id): bool
    {
        if ($this->isCsrfTokenValid('dispute-'.$id, (string) $request->request->get('_token'))) {
            return true;
        }
        $this->addFlash('error', 'La page a expiré : recharge-la et réessaie.');

        return false;
    }
}
