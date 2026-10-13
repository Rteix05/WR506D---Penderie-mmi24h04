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
 * Le look du jour : une photo de soi, et un point par vêtement porté, qui
 * désigne un vêtement du dressing (DailyLook, LookTag). Pas d'IA : on
 * choisit soi-même ; un vêtement absent du dressing s'ajoute d'un simple
 * titre, « à compléter » plus tard.
 *
 *  - GET  /api/looks/today : le look du jour du profil, ou null.
 *  - GET  /api/looks : ses looks, du plus récent au plus ancien.
 *  - POST /api/looks : multipart, champ « image ». Crée le look du jour ;
 *    409 s'il existe déjà (on le reprend, ou on le supprime d'abord).
 *  - GET, PATCH, DELETE /api/looks/{id} : PATCH change l'état
 *    (TAGGING › READY › POSTED, voir LookStatus) et la légende.
 *  - POST /api/looks/{id}/tags : {x, y (0 à 1), garment: IRI} ou
 *    {x, y, name} pour un vêtement à ajouter (créé « à compléter »).
 *  - PATCH /api/looks/{id}/tags/{tagId} : {garment: IRI} change le
 *    vêtement du point. DELETE retire le point.
 *
 * Réservé au propriétaire du look et à son tuteur (EDIT). Le look n'est
 * pas une ressource API Platform : la photo arrive en multipart.
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
    /**
     * Corps : {x, y, garment: "/api/garments/{id}"} pour un vêtement du
     * dressing, ou {x, y, name: "Veste kaki"} pour un vêtement qui n'y est
     * pas encore : il est créé « à compléter » (un titre, ni catégorie ni
     * pièce), à terminer plus tard. Le point est confirmé tout de suite.
     */
    public function addTag(string $id, Request $request): JsonResponse
    {
        $look = $this->look($id);
        $body = $request->toArray();
        $x = $body['x'] ?? null;
        $y = $body['y'] ?? null;
        if (!is_numeric($x) || !is_numeric($y)) {
            throw new BadRequestHttpException('« x » et « y » donnent la position du point (de 0 à 1).');
        }
        $name = \is_string($body['name'] ?? null) ? trim($body['name']) : null;
        if (isset($body['garment']) === (null !== $name && '' !== $name)) {
            throw new BadRequestHttpException('Donne soit « garment » (un vêtement de ton dressing), soit « name » (le titre d\'un vêtement à ajouter).');
        }

        if (isset($body['garment'])) {
            $garment = $this->garmentFrom($body['garment']);
        } else {
            // Ajouté au dressing de celui qui porte le look, à compléter plus tard.
            $this->denyAccessUnlessGranted('GARMENT_MANAGE');
            if (mb_strlen($name) > 120) {
                throw new \DomainException('Le titre fait 120 caractères au plus.');
            }
            $garment = Garment::sketch($look->getOwner(), $name);
            $this->em->persist($garment);
        }
        $tag = $look->addTag((float) $x, (float) $y);
        $tag->confirm($garment);
        $this->em->persist($tag);
        $this->em->flush();

        return $this->json($this->describeTag($tag), Response::HTTP_CREATED);
    }

    /** Corps : {garment: "/api/garments/{id}"} : change le vêtement du point. */
    #[Route('/api/looks/{id}/tags/{tagId}', name: 'api_look_tag_update', methods: ['PATCH'], requirements: ['id' => Requirement::UUID, 'tagId' => Requirement::UUID])]
    public function updateTag(string $id, string $tagId, Request $request): JsonResponse
    {
        $tag = $this->tag($this->look($id), $tagId);
        $tag->confirm($this->garmentFrom($request->toArray()['garment'] ?? null));
        $this->em->flush();

        return $this->json($this->describeTag($tag));
    }

    /** Un vêtement désigné par son IRI. Un vêtement emprunté se porte aussi : il suffit de pouvoir le voir. */
    private function garmentFrom(mixed $iri): Garment
    {
        if (!\is_string($iri) || 1 !== preg_match('#^/api/garments/('.Requirement::UUID.')$#', $iri, $m)) {
            throw new BadRequestHttpException('« garment » doit être l\'IRI d\'un vêtement (/api/garments/{id}).');
        }
        $garment = $this->em->find(Garment::class, $m[1]);
        if (null === $garment || $garment->isDeleted() || !$this->isGranted('VIEW', $garment)) {
            throw new NotFoundHttpException('Vêtement introuvable.');
        }

        return $garment;
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
                'category' => $garment->getCategory()?->getName(),
                'incomplete' => $garment->isIncomplete(),
                'brand' => $garment->getBrand()?->getName(),
                'photo' => $garment->getPhotos()[0] ?? null,
            ],
            'suggestion' => $tag->getSuggestion(),
            'model' => $tag->getDetection()['model'] ?? null,
        ];
    }
}
