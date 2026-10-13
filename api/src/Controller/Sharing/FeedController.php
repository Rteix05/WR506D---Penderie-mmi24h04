<?php

namespace App\Controller\Sharing;

use App\Entity\Dressing\DailyLook;
use App\Entity\Dressing\LookTag;
use App\Entity\Dressing\Outfit;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Relation\Follow;
use App\Entity\Relation\Friendship;
use App\Entity\Sharing\Post;
use App\Entity\Sharing\PostMedia;
use App\Enum\Relation\FriendshipStatus;
use App\Enum\Sharing\ShareAudience;
use App\Security\CurrentProfile;
use App\Security\ResourceAccess;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;

/**
 * Le fil d'actualité de Penderie (maquette, lot 16), commencé par le look
 * du jour :
 *
 *  - POST /api/looks/{id}/publish {audience: FRIENDS | FOLLOWERS, body?} :
 *    publie un look prêt. Comme le prévoit le MDD, la publication met en
 *    avant une RESSOURCE et crée le partage qui y donne accès : ici une
 *    tenue (Outfit) faite des vêtements du look. Les vêtements du look
 *    deviennent donc visibles, en lecture, par l'audience de la
 *    publication (ResourceAccess : « un look partagé qui le porte ») ; la
 *    supprimer révoque ce partage ;
 *  - GET /api/feed?before= : les publications que je peux voir (les miennes,
 *    celles de mon foyer, de mes amis, des comptes que je suis), les plus
 *    récentes d'abord, par pages de 20 ;
 *  - GET /api/posts/{id}, DELETE /api/posts/{id} (son auteur) ;
 *  - GET /api/profiles/{id}/page : la page d'un profil vue par moi, ses
 *    publications visibles et les vêtements qu'elles me montrent.
 *
 * Les points du look sont des MENTIONS, comme sur Instagram : chacun
 * donne le nom du vêtement, et « canView » dit si je peux ouvrir sa fiche.
 */
final class FeedController extends AbstractController
{
    private const PAGE = 20;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CurrentProfile $current,
        private readonly ResourceAccess $access,
    ) {
    }

    #[Route('/api/looks/{id}/publish', name: 'api_feed_publish_look', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function publishLook(string $id, Request $request): JsonResponse
    {
        $look = $this->em->find(DailyLook::class, $id);
        if (null === $look || !$this->isGranted('VIEW', $look)) {
            throw new NotFoundHttpException('Look introuvable.');
        }
        $this->denyAccessUnlessGranted('EDIT', $look);

        $body = $request->toArray();
        $audience = ShareAudience::tryFrom(\is_string($body['audience'] ?? null) ? $body['audience'] : '');
        if (!\in_array($audience, [ShareAudience::Friends, ShareAudience::Followers], true)) {
            throw new BadRequestHttpException('« audience » vaut FRIENDS (mes amis) ou FOLLOWERS (mes abonnés, amis compris).');
        }
        $text = $body['body'] ?? $look->getCaption();
        if (null !== $text && !\is_string($text)) {
            throw new BadRequestHttpException('« body » doit être un texte.');
        }
        $text = null === $text || '' === trim($text) ? null : trim($text);
        if (null !== $text && mb_strlen($text) > 2000) {
            throw new \DomainException('Le texte d\'une publication fait 2 000 caractères au plus.');
        }

        $me = $look->getOwner();
        $outfit = new Outfit($me, 'Look du '.$look->getWornOn()->format('d/m/Y'));
        foreach ($look->getGarments() as $garment) {
            $outfit->addGarment($garment);
        }
        $post = new Post($me, $text, $audience, true, $outfit);
        $look->publishIn($post); // refuse un look en préparation, ou déjà publié
        $this->em->persist($outfit);
        $this->em->persist($post);
        $this->em->persist(new PostMedia($post, $look->getPhoto()));
        $this->em->flush();

        return $this->json($this->describe($post), Response::HTTP_CREATED);
    }

    #[Route('/api/feed', name: 'api_feed_list', methods: ['GET'])]
    public function feed(Request $request): JsonResponse
    {
        $me = $this->current->get();
        $authors = [];
        foreach ([$me, ...$me->getAccount()->getProfiles()->toArray(), ...$this->friendsOf($me), ...$this->followedBy($me)] as $profile) {
            $authors[(string) $profile->getId()] = $profile;
        }

        $qb = $this->em->createQueryBuilder()
            ->select('p')->from(Post::class, 'p')
            ->where('p.author IN (:authors)')
            ->andWhere('p.deletedAt IS NULL')
            ->orderBy('p.publishedAt', 'DESC')
            ->setMaxResults(self::PAGE)
            ->setParameter('authors', array_values($authors));
        $before = $request->query->get('before');
        if (null !== $before) {
            $date = \DateTimeImmutable::createFromFormat(\DATE_ATOM, $before) ?: throw new BadRequestHttpException('« before » est une date ISO 8601.');
            $qb->andWhere('p.publishedAt < :before')->setParameter('before', $date);
        }
        $page = $qb->getQuery()->getResult();

        // L'audience se vérifie publication par publication (un ami peut ne voir que ses posts « amis »).
        $visible = array_values(array_filter($page, fn (Post $p) => $this->access->canRead($me, $p)));

        return $this->json([
            'posts' => array_map($this->describe(...), $visible),
            'next' => \count($page) === self::PAGE ? end($page)->getPublishedAt()->format(\DATE_ATOM) : null,
        ]);
    }

    #[Route('/api/posts/{id}', name: 'api_post_show', methods: ['GET'], requirements: ['id' => Requirement::UUID])]
    public function show(string $id): JsonResponse
    {
        return $this->json($this->describe($this->post($id)));
    }

    /** Supprimer une publication révoque le partage qu'elle portait : ses vêtements redeviennent privés. */
    #[Route('/api/posts/{id}', name: 'api_post_delete', methods: ['DELETE'], requirements: ['id' => Requirement::UUID])]
    public function delete(string $id): JsonResponse
    {
        $post = $this->post($id);
        $this->denyAccessUnlessGranted('EDIT', $post);
        $post->softDelete();
        $this->em->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/profiles/{id}/page', name: 'api_feed_profile_page', methods: ['GET'], requirements: ['id' => Requirement::UUID])]
    public function profilePage(string $id): JsonResponse
    {
        $me = $this->current->get();
        $profile = $this->em->find(Profile::class, $id);
        if (null === $profile || $profile->isGhost()) {
            throw new NotFoundHttpException('Profil introuvable.');
        }

        $posts = array_values(array_filter(
            $this->em->getRepository(Post::class)->findBy(['author' => $profile, 'deletedAt' => null], ['publishedAt' => 'DESC'], 60),
            fn (Post $p) => $this->access->canRead($me, $p),
        ));
        // Les vêtements que ces publications me montrent (ceux que je peux ouvrir).
        $garments = [];
        foreach ($posts as $post) {
            foreach ($this->lookOf($post)?->getGarments() ?? [] as $garment) {
                if (null === $garment->getDeletedAt() && $this->access->canRead($me, $garment)) {
                    $garments[(string) $garment->getId()] ??= $this->describeGarment($garment, true);
                }
            }
        }
        $self = $me->getId()->equals($profile->getId());

        return $this->json([
            'profile' => $this->describeAuthor($profile) + ['bio' => $profile->getBio()],
            'relation' => [
                'self' => $self,
                'household' => !$self && $this->access->isHousehold($me, $profile),
                'friend' => !$self && \in_array($profile, $this->friendsOf($me), true),
                'following' => !$self && \in_array($profile, $this->followedBy($me), true),
            ],
            'posts' => array_map($this->describe(...), $posts),
            'garments' => array_values($garments),
        ]);
    }

    private function post(string $id): Post
    {
        $post = $this->em->find(Post::class, $id);
        if (null === $post || null !== $post->getDeletedAt() || !$this->isGranted('VIEW', $post)) {
            throw new NotFoundHttpException('Publication introuvable.');
        }

        return $post;
    }

    private function lookOf(Post $post): ?DailyLook
    {
        return $this->em->getRepository(DailyLook::class)->findOneBy(['post' => $post]);
    }

    /** @return list<Profile> */
    private function friendsOf(Profile $me): array
    {
        $friendships = $this->em->createQueryBuilder()
            ->select('f')->from(Friendship::class, 'f')
            ->where('f.requester = :me OR f.addressee = :me')
            ->andWhere('f.status = :accepted')
            ->setParameter('me', $me->getId(), 'uuid')
            ->setParameter('accepted', FriendshipStatus::Accepted)
            ->getQuery()->getResult();

        return array_map(static fn (Friendship $f) => $f->getRequester() === $me ? $f->getAddressee() : $f->getRequester(), $friendships);
    }

    /** @return list<Profile> */
    private function followedBy(Profile $me): array
    {
        return array_map(static fn (Follow $f) => $f->getFollowing(), $this->em->getRepository(Follow::class)->findBy(['follower' => $me]));
    }

    /** @return array<string, mixed> */
    private function describe(Post $post): array
    {
        $me = $this->current->get();
        $look = $this->lookOf($post);
        $media = $post->getMedia()->first() ?: null;

        return [
            'id' => (string) $post->getId(),
            'author' => $this->describeAuthor($post->getAuthor()),
            'publishedAt' => $post->getPublishedAt()->format(\DATE_ATOM),
            'audience' => $post->getAudience()->value,
            'body' => $post->getBody(),
            'commentsEnabled' => $post->isCommentsEnabled(),
            'canDelete' => $this->access->isOwner($me, $post),
            'photo' => null === $media ? null : [
                'url' => '/api/media/'.$media->getMedia()->getId(),
                'width' => $media->getMedia()->getWidth(),
                'height' => $media->getMedia()->getHeight(),
            ],
            'look' => null === $look ? null : [
                'id' => (string) $look->getId(),
                'wornOn' => $look->getWornOn()->format('Y-m-d'),
                // Les mentions : un point par vêtement, avec ce que j'ai le droit d'en voir.
                'tags' => array_values(array_filter(array_map(fn (LookTag $tag) => null === $tag->getGarment() ? null : [
                    'position' => $tag->getPosition(),
                    'x' => $tag->getX(),
                    'y' => $tag->getY(),
                    'garment' => $this->describeGarment($tag->getGarment(), $this->access->canRead($me, $tag->getGarment())),
                ], $look->getTags()->toArray()))),
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function describeAuthor(Profile $profile): array
    {
        return [
            'id' => (string) $profile->getId(),
            'displayName' => $profile->getDisplayName(),
            'username' => $profile->getUsername(),
        ];
    }

    /**
     * Le nom d'un vêtement mentionné se lit toujours (il fait partie de la
     * publication) ; le reste seulement si je peux ouvrir sa fiche.
     *
     * @return array<string, mixed>
     */
    private function describeGarment(Garment $garment, bool $canView): array
    {
        $removed = null !== $garment->getDeletedAt();

        return [
            'id' => (string) $garment->getId(),
            'name' => $garment->getName(),
            'category' => $garment->getCategory()?->getName(),
            'canView' => $canView && !$removed,
        ] + ($canView && !$removed ? [
            'brand' => $garment->getBrand()?->getName(),
            'size' => $garment->getSize()?->getLabel() ?? $garment->getSizeLabel(),
            'colors' => array_values(array_map(static fn ($c) => $c->getName(), $garment->getColors()->toArray())),
            'photo' => $garment->getPhotos()[0] ?? null,
        ] : []);
    }
}
