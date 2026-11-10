<?php

namespace App\Controller\Admin;

use App\Entity\Identity\Account;
use Doctrine\ORM\EntityManagerInterface;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Writer\SvgWriter;
use OTPHP\TOTP;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Activer la double authentification (première connexion d'un
 * administrateur) : un secret TOTP est tiré et gardé en session, l'écran
 * l'affiche en QR code (et en clair), et il n'est enregistré sur le compte
 * qu'une fois un premier code de l'application vérifié. Tant que ce n'est
 * pas fait, AdminTwoFactorEnrollmentSubscriber renvoie ici.
 *
 * Le QR code est un SVG (pas de GD dans le conteneur PHP).
 */
final class TwoFactorSetupController extends AbstractController
{
    private const SESSION_KEY = 'admin_totp_pending_secret';

    /** Un code de la fenêtre de 30 s précédente ou suivante est accepté (horloge du téléphone). */
    private const LEEWAY = 29;

    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    #[Route('/admin/2fa/activer', name: 'admin_2fa_setup', methods: ['GET', 'POST'])]
    public function __invoke(Request $request): Response
    {
        $account = $this->getUser();
        \assert($account instanceof Account);
        if ($account->isTotpAuthenticationEnabled()) {
            return $this->redirectToRoute('admin_dashboard');
        }

        $session = $request->getSession();
        $secret = $session->get(self::SESSION_KEY);
        if (!\is_string($secret) || '' === $secret) {
            // 160 bits (RFC 4226) : 32 caractères en base 32.
            $secret = TOTP::generate(null, 20)->getSecret();
            $session->set(self::SESSION_KEY, $secret);
        }
        $totp = TOTP::createFromSecret($secret);
        $totp->setLabel($account->getEmail());
        $totp->setIssuer('Penderie');

        $error = null;
        if ($request->isMethod('POST')) {
            $code = preg_replace('/\s+/', '', (string) $request->request->get('code'));
            if (!$this->isCsrfTokenValid('admin-2fa-setup', (string) $request->request->get('_token'))) {
                $error = 'La page a expiré : recharge-la et réessaie.';
            } elseif (!\is_string($code) || !preg_match('/^\d{6}$/', $code) || !$totp->verify($code, null, self::LEEWAY)) {
                $error = 'Ce code ne correspond pas. Vérifie l’heure du téléphone et saisis le code affiché maintenant.';
            } else {
                $account->setTotpSecret($secret);
                $this->em->flush();
                $session->remove(self::SESSION_KEY);
                $this->addFlash('success', 'Double authentification activée : elle sera demandée à chaque connexion.');

                return $this->redirectToRoute('admin_dashboard');
            }
        }

        return $this->render('admin/2fa_setup.html.twig', [
            'qr' => (new Builder(writer: new SvgWriter(), data: $totp->getProvisioningUri(), size: 220, margin: 0))->build()->getDataUri(),
            'secret' => trim(chunk_split($secret, 4, ' ')),
            'error' => $error,
        ], new Response(status: null === $error ? 200 : 422));
    }
}
