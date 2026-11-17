<?php

namespace App\Controller\Sharing;

use App\Entity\Identity\Profile;
use App\Entity\Notification\Notification;
use App\Entity\Sharing\Comment;
use App\Entity\Sharing\Post;
use App\Entity\Sharing\PostComment;
use App\Entity\Sharing\PostLike;
use App\Enum\Notification\NotificationType;
use App\Security\CurrentProfile;
use App\Security\ResourceAccess;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;

/**
 * « J'aime » et commentaires d'une publication du fil (maquette
 * « Commentaires sur une pièce » : liste, Répondre, Ton commentaire).
 *
 *  - PUT /api/posts/{id}/like, DELETE /api/posts/{id}/like : aimer, ne plus
 *    aimer (idempotents) ; renvoient {liked, likeCount}. Qui voit la
 *    publication peut l'aimer, abonnés compris ;
 *  - GET /api/posts/{id}/comments : les commentaires visibles, du plus
 *    ancien au plus récent, réponses comprises (parentId) ;
 *  - POST /api/posts/{id}/comments {body, parent?} : commenter, ou répondre
 *    à un commentaire. Seulement si la publication l'autorise (amis,
 *    personnes choisies : jamais les abonnés, règle du MDD) ;
 *  - DELETE /api/posts/{id}/comments/{commentId} : l'auteur du commentaire,
 *    ou celui de la publication (suppression douce).
 *
 * L'auteur de la publication reçoit une notification pour un commentaire,
 * pas pour un « j'aime » (pas de bruit).
 */
final class PostSocialController extends AbstractController
{
    private const MAX_BODY = 1000;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CurrentProfile $current,
        private readonly ResourceAccess $access,
    ) {
    }

    #[Route('/api/posts/{id}/like', name: 'api_post_like', methods: ['PUT'], requirements: ['id' => Requirement::UUID])]
    public function like(string $id): JsonResponse
    {
        $post = $this->post($id);
        $me = $this->current->get();
        if (null === $this->em->find(PostLike::class, ['post' => $post, 'profile' => $me])) {
            $this->em->persist(new PostLike($post, $me));
            $this->em->flush();
        }

        return $this->likes($post);
    }

    #[Route('/api/posts/{id}/like', name: 'api_post_unlike', methods: ['DELETE'], requirements: ['id' => Requirement::UUID])]
    public function unlike(string $id): JsonResponse
    {
        $post = $this->post($id);
        $like = $this->em->find(PostLike::class, ['post' => $post, 'profile' => $this->current->get()]);
        if (null !== $like) {
            $this->em->remove($like);
            $this->em->flush();
        }

        return $this->likes($post);
    }

    #[Route('/api/posts/{id}/comments', name: 'api_post_comments', methods: ['GET'], requirements: ['id' => Requirement::UUID])]
    public function comments(string $id): JsonResponse
    {
        $post = $this->post($id);
        $comments = $this->em->getRepository(PostComment::class)->findBy(['post' => $post, 'deletedAt' => null, 'hiddenAt' => null], ['createdAt' => 'ASC']);

        return $this->json(['comments' => array_map(fn (PostComment $c) => $this->describe($c, $post), $comments)]);
    }

    #[Route('/api/posts/{id}/comments', name: 'api_post_comment_add', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function add(string $id, Request $request): JsonResponse
    {
        $post = $this->post($id);
        $me = $this->current->get();
        if (!$post->isCommentsEnabled()) {
            throw new AccessDeniedHttpException('Cette publication n\'accepte pas de commentaires (les abonnés lisent sans commenter).');
        }

        $data = json_decode($request->getContent(), true);
        $body = \is_array($data) && \is_string($data['body'] ?? null) ? trim($data['body']) : '';
        if ('' === $body || mb_strlen($body) > self::MAX_BODY) {
            throw new BadRequestHttpException(\sprintf('Le commentaire fait de 1 à %d caractères.', self::MAX_BODY));
        }
        $parent = null;
        if (\is_string($data['parent'] ?? null)) {
            $parent = $this->em->find(PostComment::class, $data['parent']);
            if (null === $parent || !$parent->getPost()->getId()->equals($post->getId()) || null !== $parent->getDeletedAt()) {
                throw new BadRequestHttpException('On répond à un commentaire de cette publication.');
            }
            // Un seul niveau de réponses, comme la maquette : on répond au fil, pas à une réponse.
            $parent = $parent->getParent() instanceof PostComment ? $parent->getParent() : $parent;
        }

        $comment = new PostComment($me, $post, $body, $parent);
        $this->em->persist($comment);
        if (!$post->getAuthor()->getId()->equals($me->getId())) {
            $this->em->persist(new Notification($post->getAuthor(), NotificationType::CommentAdded, $me->getDisplayName().' a commenté ta publication', mb_substr($body, 0, 140), ['post' => (string) $post->getId()], $me));
        }
        $this->em->flush();

        return $this->json($this->describe($comment, $post), Response::HTTP_CREATED);
    }

    #[Route('/api/posts/{id}/comments/{commentId}', name: 'api_post_comment_delete', methods: ['DELETE'], requirements: ['id' => Requirement::UUID, 'commentId' => Requirement::UUID])]
    public function delete(string $id, string $commentId): JsonResponse
    {
        $post = $this->post($id);
        $comment = $this->em->find(PostComment::class, $commentId);
        if (null === $comment || !$comment->getPost()->getId()->equals($post->getId()) || null !== $comment->getDeletedAt()) {
            throw new NotFoundHttpException('Commentaire introuvable.');
        }
        if (!$this->canDelete($comment, $post, $this->current->get())) {
            throw new AccessDeniedHttpException('Seuls l\'auteur du commentaire et celui de la publication le suppriment.');
        }
        $comment->softDelete();
        $this->em->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    private function likes(Post $post): JsonResponse
    {
        $counts = $this->em->getRepository(PostLike::class)->countsFor([$post], $this->current->get())[(string) $post->getId()];

        return $this->json(['liked' => $counts['liked'], 'likeCount' => $counts['likes']]);
    }

    /** Une publication que je peux voir, sinon 404 (on ne révèle pas qu'elle existe). */
    private function post(string $id): Post
    {
        $post = $this->em->find(Post::class, $id);
        $me = $this->current->get();
        if (null === $post || null !== $post->getDeletedAt() || !($this->access->isOwner($me, $post) || $this->access->canRead($me, $post))) {
            throw new NotFoundHttpException('Publication introuvable.');
        }

        return $post;
    }

    private function canDelete(Comment $comment, Post $post, Profile $me): bool
    {
        return $comment->getAuthor()->getId()->equals($me->getId()) || $post->getAuthor()->getId()->equals($me->getId());
    }

    /** @return array<string, mixed> */
    private function describe(PostComment $comment, Post $post): array
    {
        $me = $this->current->get();
        $author = $comment->getAuthor();

        return [
            'id' => (string) $comment->getId(),
            'parentId' => null === $comment->getParent() ? null : (string) $comment->getParent()->getId(),
            'author' => ['id' => (string) $author->getId(), 'displayName' => $author->getDisplayName(), 'username' => $author->getUsername()],
            'body' => $comment->getBody(),
            'createdAt' => $comment->getCreatedAt()?->format(\DATE_ATOM),
            'mine' => $author->getId()->equals($me->getId()),
            'canDelete' => $this->canDelete($comment, $post, $me),
        ];
    }
}
