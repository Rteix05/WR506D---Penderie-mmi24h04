<?php

namespace App\Controller\Inventory;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\GarmentMedia;
use App\Entity\Inventory\Item;
use App\Entity\Inventory\ItemMedia;
use App\Entity\Media\Media;
use App\Security\CurrentProfile;
use App\Service\Media\MediaStorage;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;

/**
 * Les photos d'un objet ou d'un vêtement.
 *
 *  - POST /api/items/{id}/photos, POST /api/garments/{id}/photos :
 *    multipart, champ « image ». Réservé à qui peut modifier le bien
 *    (EDIT : propriétaire ou tuteur). La première photo devient la
 *    principale. Le fichier va sur le disque (MediaStorage), la base garde
 *    un Media et son lien de galerie (ItemMedia / GarmentMedia).
 *  - GET /api/media/{id} : le fichier lui-même, pour qui peut VOIR un bien
 *    qui l'utilise (ou son propriétaire). Les photos sont privées comme les
 *    objets : jamais de lien public, 404 pour les autres (on ne révèle pas
 *    qu'une photo existe).
 */
final class PhotoController extends AbstractController
{
    /** Mêmes limites que le scan : au-delà, la photo n'a pas été réduite par l'app. */
    private const MAX_BYTES = 8 * 1024 * 1024;
    private const MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    /** Une galerie raisonnable ; au-delà, c'est probablement une boucle côté client. */
    private const MAX_PHOTOS = 12;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly MediaStorage $storage,
        private readonly CurrentProfile $current,
    ) {
    }

    #[Route('/api/items/{id}/photos', name: 'api_item_photo_add', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function addToItem(string $id, Request $request): JsonResponse
    {
        $item = $this->em->find(Item::class, $id) ?? throw new NotFoundHttpException('Objet introuvable.');
        $this->denyAccessUnlessGranted('EDIT', $item);
        if (null !== $item->getDeletedAt()) {
            throw new NotFoundHttpException('Objet introuvable.');
        }

        $count = $item->getGallery()->count();
        $media = $this->storeUpload($request, $item->getOwner(), $count);
        $link = new ItemMedia($item, $media, $count, 0 === $count);
        $item->attachMedia($link);
        $this->em->persist($link);
        $this->em->flush();

        return $this->json(self::describe($media, $link->isPrimary(), $count), Response::HTTP_CREATED);
    }

    #[Route('/api/garments/{id}/photos', name: 'api_garment_photo_add', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function addToGarment(string $id, Request $request): JsonResponse
    {
        $garment = $this->em->find(Garment::class, $id) ?? throw new NotFoundHttpException('Vêtement introuvable.');
        $this->denyAccessUnlessGranted('EDIT', $garment);
        if (null !== $garment->getDeletedAt()) {
            throw new NotFoundHttpException('Vêtement introuvable.');
        }

        $count = $garment->getGallery()->count();
        $media = $this->storeUpload($request, $garment->getOwner(), $count);
        $link = new GarmentMedia($garment, $media, $count, 0 === $count);
        $garment->attachMedia($link);
        $this->em->persist($link);
        $this->em->flush();

        return $this->json(self::describe($media, $link->isPrimary(), $count), Response::HTTP_CREATED);
    }

    #[Route('/api/media/{id}', name: 'api_media_show', methods: ['GET'], requirements: ['id' => Requirement::UUID])]
    public function show(string $id): Response
    {
        $media = $this->em->find(Media::class, $id);
        if (null === $media || !$this->canView($media) || !$this->storage->exists($media->getPath())) {
            throw new NotFoundHttpException('Photo introuvable.');
        }

        // 8 Mo au plus (limite d'envoi) : une réponse simple suffit, pas de flux.
        $response = new Response((string) file_get_contents($this->storage->absolute($media->getPath())));
        $response->headers->set('Content-Type', $media->getMimeType());
        // Privée : jamais en cache partagé (proxy, CDN), seulement sur le téléphone.
        $response->setPrivate();
        $response->setMaxAge(86400);

        return $response;
    }

    /** Vérifie et range le fichier envoyé, puis crée le Media (sans le lier). */
    private function storeUpload(Request $request, Profile $owner, int $count): Media
    {
        if ($count >= self::MAX_PHOTOS) {
            throw new BadRequestHttpException(\sprintf('%d photos au plus par objet.', self::MAX_PHOTOS));
        }
        $file = $request->files->get('image');
        if (!$file instanceof UploadedFile || !$file->isValid()) {
            throw new BadRequestHttpException('Le champ « image » doit contenir une photo.');
        }
        if ($file->getSize() > self::MAX_BYTES) {
            throw new BadRequestHttpException('Image trop lourde (8 Mo au plus).');
        }
        $bytes = (string) file_get_contents($file->getPathname());
        // Le type est lu dans les octets, jamais dans le nom ou l'en-tête envoyés.
        $info = @getimagesizefromstring($bytes);
        $mimeType = $info['mime'] ?? null;
        if (!\in_array($mimeType, self::MIME_TYPES, true)) {
            throw new BadRequestHttpException('Formats acceptés : JPEG, PNG, WebP.');
        }

        $media = new Media($owner, $this->storage->store($bytes, $mimeType), $mimeType, \strlen($bytes));
        $media->setDimensions($info[0] ?: null, $info[1] ?: null);
        $this->em->persist($media);

        return $media;
    }

    /**
     * Voir une photo : son propriétaire (ou un profil du même compte qui en
     * est tuteur, via le voter), ou quiconque peut VOIR un bien qui l'utilise.
     */
    private function canView(Media $media): bool
    {
        if ($media->getOwner()->getId()->equals($this->current->get()->getId())) {
            return true;
        }
        foreach ($this->em->getRepository(ItemMedia::class)->findBy(['media' => $media]) as $link) {
            if (null === $link->getItem()->getDeletedAt() && $this->isGranted('VIEW', $link->getItem())) {
                return true;
            }
        }
        foreach ($this->em->getRepository(GarmentMedia::class)->findBy(['media' => $media]) as $link) {
            if (null === $link->getGarment()->getDeletedAt() && $this->isGranted('VIEW', $link->getGarment())) {
                return true;
            }
        }

        return false;
    }

    /** @return array<string, mixed> */
    private static function describe(Media $media, bool $primary, int $position): array
    {
        return [
            'id' => (string) $media->getId(),
            '@id' => '/api/media/'.$media->getId(),
            'url' => '/api/media/'.$media->getId(),
            'mimeType' => $media->getMimeType(),
            'width' => $media->getWidth(),
            'height' => $media->getHeight(),
            'primary' => $primary,
            'position' => $position,
        ];
    }
}
