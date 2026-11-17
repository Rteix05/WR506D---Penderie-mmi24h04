<?php

namespace App\Controller\Admin;

use App\EventSubscriber\AdminLocaleSubscriber;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Paramètres du back-office : pour l'instant, la langue (français, anglais,
 * japonais). Le choix passe par ?lang= sur cette page et reste en session
 * (AdminLocaleSubscriber) ; sans choix, la langue du navigateur.
 */
final class SettingsController extends AbstractController
{
    #[Route('/admin/parametres', name: 'admin_settings', methods: ['GET'])]
    public function __invoke(): Response
    {
        return $this->render('admin/settings/index.html.twig', [
            'languages' => array_combine(AdminLocaleSubscriber::LOCALES, ['Français', 'English', '日本語']),
        ]);
    }
}
