<?php

namespace App\Controller\Admin;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Authentication\AuthenticationUtils;

/**
 * Connexion au back-office (maquette « Admin — Connexion ») : e-mail et mot
 * de passe d'un compte ROLE_ADMIN. Le pare-feu « admin » (form_login) traite
 * l'envoi du formulaire ; AdminUserChecker refuse les autres comptes.
 *
 * La double authentification de la maquette (« Code de vérification »)
 * viendra dans un second temps.
 */
final class SecurityController extends AbstractController
{
    #[Route('/admin/connexion', name: 'admin_login', methods: ['GET', 'POST'])]
    public function login(AuthenticationUtils $authentication): Response
    {
        if ($this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('admin_dashboard');
        }

        return $this->render('admin/login.html.twig', [
            'email' => $authentication->getLastUsername(),
            'error' => $authentication->getLastAuthenticationError(),
        ]);
    }

    /** Interceptée par le pare-feu (logout) : ce corps ne s'exécute jamais. */
    #[Route('/admin/deconnexion', name: 'admin_logout', methods: ['GET'])]
    public function logout(): never
    {
        throw new \LogicException('La déconnexion est gérée par le pare-feu « admin ».');
    }
}
