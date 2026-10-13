<?php

namespace App\Controller\Dressing;

use ApiPlatform\Metadata\IriConverterInterface;
use App\Entity\Dressing\DailyLook;
use App\Entity\Dressing\LookTag;
use App\Entity\Dressing\WearLog;
use App\Entity\Inventory\Garment;
use App\Entity\Media\Media;
use App\Enum\Dressing\LookStatus;
use App\Security\CurrentProfile;
use App\Service\Dressing\LookTagDetector;
use App\Service\Media\MediaStorage;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;

/**
 * Le look du jour : une photo de soi, un point par vêtement porté, et l'IA
 * qui reconnaît chaque vêtement (DailyLook, LookTag).
 *
 *  - GET  /api/looks/today : le look du jour du profil, ou null.
 *  - GET  /api/looks : ses looks, du plus récent au plus ancien.
 *  - POST /api/looks : multipart, champ « image ». Crée le look du jour ;
 *    409 s'il existe déjà (on le reprend, ou on le supprime d'abord).
 *  - GET, PATCH, DELETE /api/looks/{id} : PATCH change l'état
 *    (TAGGING › READY › POSTED, voir LookStatus) et la légende.
 *  - POST /api/looks/{id}/tags : multipart x, y (0 à 1) et image, le gros
 *    plan découpé par l'app autour du point, et cropX, cropY, cropW, cropH
 *    (facultatifs, de 0 à 1) : où il a été découpé dans la photo. L'IA
 *    répond dans la foulée, avec le contour du vêtement (box).
 *  - PATCH /api/looks/{id}/tags/{tagId} : {garment: IRI} confirme le
 *    vêtement du point. DELETE retire le point.
 *
 * Réservé au propriétaire du look et à son tuteur (EDIT). Le look n'est
 * pas une ressource API Platform : la photo arrive en multipart et l'IA
 * répond pendant la requête, comme pour le scan.
 */
final class LookController extends AbstractController
{
    /** Mêmes limites que le scan et les photos d'objet. */
    private const MAX_BYTES = 8 * 1024 * 1024;
    private const MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CurrentProfile $current,
        private readonly MediaStorage $storage,
        private readonly LookTagDetector $detector,
        private readonly IriConverterInterface $iris,
    ) {
    }

    #[Route('/api/looks/today', name: 'api_look_today', methods: ['GET'])]
    public function today(): JsonResponse
    {
        $look = $this->em->getRepository(DailyLook::class)->findOneBy(['owner' => $this->current->get(), 'wornOn' => new \DateTimeImmutable('today')]);

        return $this->json(['look' => null === $look ? null : $this->describe($look)]);
    }

    #[Route('/api/looks', name: 'api_look_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $looks = $this->em->getRepository(DailyLook::class)->findBy(['owner' => $this->current->get()], ['wornOn' => 'DESC'], 60);

        return $this->json(array_map($this->describe(...), $looks));
    }

    #[Route('/api/looks', name: 'api_look_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $me = $this->current->get();
        $existing = $this->em->getRepository(DailyLook::class)->findOneBy(['owner' => $me, 'wornOn' => new \DateTimeImmutable('today')]);
        if (null !== $existing) {
            throw new ConflictHttpException('Tu as déjà un look aujourd\'hui : reprends-le, ou supprime-le pour en prendre un autre.');
        }

        [$bytes, $mimeType, $width, $height] = $this->readImage($request);
        $photo = new Media($me, $this->storage->store($bytes, $mimeType), $mimeType, \strlen($bytes));
        $photo->setDimensions($width ?: null, $height ?: null);
        $look = new DailyLook($me, $photo);
        $this->em->persist($photo);
        $this->em->persist($look);
        $this->em->flush();

        return $this->json($this->describe($look), Response::HTTP_CREATED);
    }

    #[Route('/api/looks/{id}', name: 'api_look_show', methods: ['GET'], requirements: ['id' => Requirement::UUID])]
    public function show(string $id): JsonResponse
    {
        return $this->json($this->describe($this->look($id)));
    }

    /**
     * Corps : {status?: TAGGING | READY | POSTED, caption?: string | null}.
     * Passer à READY note le port de chaque vêtement ce jour-là (WearLog) :
     * le moteur de suggestion évite ensuite ce qu'on a porté récemment.
     */
    #[Route('/api/looks/{id}', name: 'api_look_update', methods: ['PATCH'], requirements: ['id' => Requirement::UUID])]
    public function update(string $id, Request $request): JsonResponse
    {
        $look = $this->look($id);
        $body = $request->toArray();

        if (\array_key_exists('caption', $body)) {
            if (null !== $body['caption'] && !\is_string($body['caption'])) {
                throw new BadRequestHttpException('« caption » doit être un texte.');
            }
            if (LookStatus::Posted === $look->getStatus()) {
                throw new \DomainException('Ce look est déjà posté : il ne se modifie plus.');
            }
            if (mb_strlen($body['caption'] ?? '') > 2200) {
                throw new \DomainException('La légende fait 2 200 caractères au plus (limite d\'Instagram).');
            }
            $look->setCaption($body['caption']);
        }
        if (\array_key_exists('status', $body)) {
            $status = \is_string($body['status']) ? LookStatus::tryFrom($body['status']) : null;
            if (null === $status) {
                throw new BadRequestHttpException('« status » vaut TAGGING, READY ou POSTED.');
            }
            $look->moveTo($status);
            if (LookStatus::Ready === $status) {
                $this->recordWear($look);
            }
        }
        $this->em->flush();

        return $this->json($this->describe($look));
    }

    /** Supprime le look, ses points et sa photo. Les ports notés restent : la tenue a bien été portée. */
    #[Route('/api/looks/{id}', name: 'api_look_delete', methods: ['DELETE'], requirements: ['id' => Requirement::UUID])]
    public function delete(string $id): JsonResponse
    {
        $look = $this->look($id);
        if (null !== $look->getPost()) {
            // Sa photo est celle de la publication (et une publication supprimée reste en base).
            throw new \DomainException('Ce look a été publié dans le fil : il ne se supprime plus.');
        }
        $photo = $look->getPhoto();
        $path = $photo->getPath();
        $this->em->remove($look);
        $this->em->flush();
        $this->em->remove($photo);
        $this->em->flush();
        $this->storage->delete($path);

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/looks/{id}/tags', name: 'api_look_tag_add', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function addTag(string $id, Request $request): JsonResponse
    {
        $look = $this->look($id);
        $x = $request->request->get('x');
        $y = $request->request->get('y');
        if (!is_numeric($x) || !is_numeric($y)) {
            throw new BadRequestHttpException('Les champs « x » et « y » donnent la position du point (de 0 à 1).');
        }
        [$bytes, $mimeType] = $this->readImage($request);
        $crop = $this->readCrop($request);

        $tag = $look->addTag((float) $x, (float) $y);
        $this->detector->detect($tag, $bytes, $mimeType, $crop);
        $this->em->persist($tag);
        $this->em->flush();

        return $this->json($this->describeTag($tag), Response::HTTP_CREATED);
    }

    /** Corps : {garment: "/api/garments/{id}"}. */
    #[Route('/api/looks/{id}/tags/{tagId}', name: 'api_look_tag_update', methods: ['PATCH'], requirements: ['id' => Requirement::UUID, 'tagId' => Requirement::UUID])]
    public function updateTag(string $id, string $tagId, Request $request): JsonResponse
    {
        $tag = $this->tag($this->look($id), $tagId);
        $iri = $request->toArray()['garment'] ?? null;
        if (!\is_string($iri) || 1 !== preg_match('#^/api/garments/('.Requirement::UUID.')$#', $iri, $m)) {
            throw new BadRequestHttpException('« garment » doit être l\'IRI d\'un vêtement (/api/garments/{id}).');
        }
        $garment = $this->em->find(Garment::class, $m[1]);
        // Un vêtement emprunté se porte aussi : il suffit de pouvoir le voir.
        if (null === $garment || $garment->isDeleted() || !$this->isGranted('VIEW', $garment)) {
            throw new NotFoundHttpException('Vêtement introuvable.');
        }
        $tag->confirm($garment);
        $this->em->flush();

        return $this->json($this->describeTag($tag));
    }

    #[Route('/api/looks/{id}/tags/{tagId}', name: 'api_look_tag_delete', methods: ['DELETE'], requirements: ['id' => Requirement::UUID, 'tagId' => Requirement::UUID])]
    public function deleteTag(string $id, string $tagId): JsonResponse
    {
        $look = $this->look($id);
        $look->removeTag($this->tag($look, $tagId));
        $this->em->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    /** Un look qu'on peut gérer ; 404 sinon (on ne révèle pas qu'il existe). */
    private function look(string $id): DailyLook
    {
        $look = $this->em->find(DailyLook::class, $id);
        if (null === $look || !$this->isGranted('EDIT', $look)) {
            throw new NotFoundHttpException('Look introuvable.');
        }

        return $look;
    }

    private function tag(DailyLook $look, string $tagId): LookTag
    {
        foreach ($look->getTags() as $tag) {
            if ((string) $tag->getId() === $tagId) {
                return $tag;
            }
        }

        throw new NotFoundHttpException('Point introuvable.');
    }

    /** Un port par vêtement et par jour (contrainte unique) : on ne note que ce qui manque. */
    private function recordWear(DailyLook $look): void
    {
        foreach ($look->getGarments() as $garment) {
            $known = $this->em->getRepository(WearLog::class)->findOneBy(['garment' => $garment, 'profile' => $look->getOwner(), 'wornAt' => $look->getWornOn()]);
            if (null === $known) {
                $this->em->persist(new WearLog($garment, $look->getOwner(), $look->getWornOn()));
            }
        }
    }

    /**
     * Où le gros plan a été découpé dans la photo du look, si l'app le dit
     * (une ancienne version ne l'envoie pas : on suppose alors le point au
     * centre du gros plan, sans contour).
     *
     * @return array{x: float, y: float, w: float, h: float}|null
     */
    private function readCrop(Request $request): ?array
    {
        $fields = ['x' => 'cropX', 'y' => 'cropY', 'w' => 'cropW', 'h' => 'cropH'];
        $crop = [];
        foreach ($fields as $key => $field) {
            $value = $request->request->get($field);
            if (null === $value) {
                return null;
            }
            if (!is_numeric($value) || (float) $value < 0 || (float) $value > 1) {
                throw new BadRequestHttpException(\sprintf('« %s » est une part de la photo, de 0 à 1.', $field));
            }
            $crop[$key] = (float) $value;
        }
        if ($crop['w'] <= 0 || $crop['h'] <= 0) {
            throw new BadRequestHttpException('Le gros plan a une largeur et une hauteur (cropW, cropH).');
        }

        return $crop;
    }

    /**
     * La photo envoyée, vérifiée : octets, type lu dans les octets, largeur, hauteur.
     *
     * @return array{0: string, 1: string, 2: int, 3: int}
     */
    private function readImage(Request $request): array
    {
        $file = $request->files->get('image');
        if (!$file instanceof UploadedFile || !$file->isValid()) {
            throw new BadRequestHttpException('Le champ « image » doit contenir une photo.');
        }
        if ($file->getSize() > self::MAX_BYTES) {
            throw new BadRequestHttpException('Image trop lourde (8 Mo au plus).');
        }
        $bytes = (string) file_get_contents($file->getPathname());
        $info = @getimagesizefromstring($bytes);
        $mimeType = $info['mime'] ?? null;
        if (!\in_array($mimeType, self::MIME_TYPES, true)) {
            throw new BadRequestHttpException('Formats acceptés : JPEG, PNG, WebP.');
        }

        return [$bytes, $mimeType, (int) $info[0], (int) $info[1]];
    }

    /** @return array<string, mixed> */
    private function describe(DailyLook $look): array
    {
        $photo = $look->getPhoto();

        return [
            'id' => (string) $look->getId(),
            '@id' => '/api/looks/'.$look->getId(),
            'wornOn' => $look->getWornOn()->format('Y-m-d'),
            'status' => $look->getStatus()->value,
            'caption' => $look->getCaption(),
            'postedAt' => $look->getPostedAt()?->format(\DATE_ATOM),
            'photo' => ['url' => '/api/media/'.$photo->getId(), 'width' => $photo->getWidth(), 'height' => $photo->getHeight()],
            'tags' => array_map($this->describeTag(...), $look->getTags()->toArray()),
            // La publication dans le fil de Penderie, s'il y en a une en ligne.
            'post' => $look->isPublished() ? ['id' => (string) $look->getPost()->getId(), 'audience' => $look->getPost()->getAudience()->value] : null,
        ];
    }

    /** @return array<string, mixed> */
    private function describeTag(LookTag $tag): array
    {
        $garment = $tag->getGarment();

        return [
            'id' => (string) $tag->getId(),
            'x' => $tag->getX(),
            'y' => $tag->getY(),
            'position' => $tag->getPosition(),
            'status' => $tag->getStatus()->value,
            'garment' => null === $garment ? null : [
                '@id' => $this->iris->getIriFromResource($garment),
                'id' => (string) $garment->getId(),
                'name' => $garment->getName(),
                'category' => $garment->getCategory()->getName(),
                'brand' => $garment->getBrand()?->getName(),
                'photo' => $garment->getPhotos()[0] ?? null,
            ],
            'suggestion' => $tag->getSuggestion(),
            'model' => $tag->getDetection()['model'] ?? null,
            // Le contour du vêtement selon l'IA, sur la photo du look ; et si elle a regardé à côté du point.
            'box' => $tag->getBox(),
            'offTarget' => $tag->getDetection()['offTarget'] ?? false,
        ];
    }
}
