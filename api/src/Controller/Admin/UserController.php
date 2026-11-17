<?php

namespace App\Controller\Admin;

use App\Entity\Identity\Account;
use App\Service\Admin\AccountModerator;
use App\Service\Admin\UserDirectory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;

/**
 * Utilisateurs du back-office (maquettes « Admin — Utilisateurs », « Fiche
 * utilisateur » et « Confirmation · Suspendre un compte »). La suspension et
 * la réactivation sont des POST protégés par un jeton CSRF, avec un motif
 * gardé dans le journal de modération.
 */
#[Route('/admin/utilisateurs')]
final class UserController extends AbstractController
{
    public function __construct(
        private readonly UserDirectory $directory,
        private readonly AccountModerator $moderator,
        private readonly EntityManagerInterface $em,
    ) {
    }

    #[Route('', name: 'admin_users', methods: ['GET'])]
    public function index(Request $request): Response
    {
        $filter = \in_array($request->query->get('filter'), UserDirectory::FILTERS, true) ? (string) $request->query->get('filter') : 'all';
        $query = trim((string) $request->query->get('q', ''));
        $page = max(1, $request->query->getInt('page', 1));

        return $this->render('admin/users/index.html.twig', [
            'filter' => $filter,
            'query' => $query,
            'page' => $page,
            'perPage' => UserDirectory::PER_PAGE,
            'counts' => $this->directory->counts(),
        ] + $this->directory->search($filter, $query, $page));
    }

    #[Route('/{id}', name: 'admin_user', methods: ['GET'], requirements: ['id' => Requirement::UUID])]
    public function show(string $id): Response
    {
        $account = $this->account($id);

        return $this->render('admin/users/show.html.twig', [
            'account' => $account,
            'suspended' => $this->moderator->isSuspended($account),
            'history' => $this->moderator->history($account),
        ] + $this->directory->details($account));
    }

    #[Route('/{id}/suspendre', name: 'admin_user_suspend', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function suspend(string $id, Request $request): Response
    {
        return $this->moderate($id, $request, 'suspend');
    }

    #[Route('/{id}/reactiver', name: 'admin_user_reinstate', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function reinstate(string $id, Request $request): Response
    {
        return $this->moderate($id, $request, 'reinstate');
    }

    private function moderate(string $id, Request $request, string $action): Response
    {
        $account = $this->account($id);
        if (!$this->isCsrfTokenValid('moderate-'.$id, (string) $request->request->get('_token'))) {
            $this->addFlash('error', 'La page a expiré : recharge-la et réessaie.');

            return $this->redirectToRoute('admin_user', ['id' => $id]);
        }
        $admin = $this->getUser();
        \assert($admin instanceof Account);
        try {
            $reason = (string) $request->request->get('reason', '');
            'suspend' === $action ? $this->moderator->suspend($account, $admin, $reason) : $this->moderator->reinstate($account, $admin, $reason);
            $this->addFlash('success', 'suspend' === $action ? 'Compte suspendu : ses profils ne peuvent plus utiliser l’application.' : 'Compte réactivé.');
        } catch (\DomainException $e) {
            $this->addFlash('error', $e->getMessage());
        }

        return $this->redirectToRoute('admin_user', ['id' => $id]);
    }

    private function account(string $id): Account
    {
        $account = $this->em->find(Account::class, $id);
        if (null === $account || $account->isGhost()) {
            throw $this->createNotFoundException('Compte introuvable.');
        }

        return $account;
    }
}
