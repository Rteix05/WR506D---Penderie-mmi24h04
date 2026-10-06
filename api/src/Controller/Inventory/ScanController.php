<?php

namespace App\Controller\Inventory;

use App\Enum\Inventory\ScanKind;
use App\Security\CurrentProfile;
use App\Service\Scan\ScanAnalyzer;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Analyse d'une photo par l'IA : l'app envoie l'image, l'API renvoie de
 * quoi pré-remplir la fiche. Rien n'est créé côté inventaire ; l'app crée
 * ensuite l'objet ou le vêtement avec les champs que l'utilisateur garde.
 *
 * L'image n'est pas conservée (pas encore de stockage S3) : seule la trace
 * Scan l'est, y compris quand l'analyse échoue — l'app bascule alors sur
 * la saisie manuelle.
 */
final class ScanController extends AbstractController
{
    /** Au-delà, l'envoi en base64 à OpenRouter devient lent pour rien. */
    private const MAX_BYTES = 8 * 1024 * 1024;

    /** Les formats acceptés par les modèles de vision d'OpenRouter. */
    private const MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    public function __construct(
        private readonly CurrentProfile $current,
        private readonly ScanAnalyzer $analyzer,
    ) {
    }

    /** Multipart : kind (PHOTO | LABEL_OCR) et image (fichier). */
    #[Route('/api/scans/analyze', name: 'api_scan_analyze', methods: ['POST'])]
    public function analyze(Request $request): JsonResponse
    {
        $kind = ScanKind::from((string) $request->request->get('kind', ScanKind::Photo->value));
        $file = $request->files->get('image');
        if (!$file instanceof UploadedFile || !$file->isValid()) {
            throw new BadRequestHttpException('Le champ « image » doit contenir une photo.');
        }
        if ($file->getSize() > self::MAX_BYTES) {
            throw new BadRequestHttpException('Image trop lourde (8 Mo au plus).');
        }
        $bytes = (string) file_get_contents($file->getPathname());
        $mimeType = @getimagesizefromstring($bytes)['mime'] ?? null;
        if (!\in_array($mimeType, self::MIME_TYPES, true)) {
            throw new BadRequestHttpException('Formats acceptés : JPEG, PNG, WebP.');
        }

        $result = $this->analyzer->analyze($this->current->get(), $kind, $bytes, $mimeType);
        $scan = $result['scan'];

        return $this->json([
            'scanId' => (string) $scan->getId(),
            'kind' => $scan->getKind()->value,
            'status' => $scan->getStatus()->value,
            'model' => $scan->getRawData()['model'] ?? null,
            'suggestion' => $result['suggestion'],
            'error' => $result['error'],
        ], Response::HTTP_CREATED);
    }
}
