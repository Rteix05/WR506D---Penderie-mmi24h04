<?php

namespace App\Controller\Notification;

use App\Entity\Notification\Notification;
use App\Security\CurrentProfile;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;

/**
 * Les notifications du profil actif (maquette « Notifications — Liste ») :
 *
 *  - GET  /api/notifications?before= : les plus récentes d'abord, par pages
 *    de 30, avec le nombre de non lues ;
 *  - GET  /api/notifications/unread-count : la pastille de l'accueil ;
 *  - POST /api/notifications/{id}/read : lue (en l'ouvrant) ;
 *  - POST /api/notifications/read-all : « Tout marquer comme lu ».
 *
 * Chaque notification porte data : de quoi ouvrir le bon écran (post,
 * loan, share avec targetType et targetId, contribution, report).
 */
#[Route('/api/notifications')]
final class NotificationController extends AbstractController
{
    private const PAGE = 30;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CurrentProfile $current,
    ) {
    }

    #[Route('', name: 'api_notifications', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $qb = $this->em->createQueryBuilder()
            ->select('n', 'a')->from(Notification::class, 'n')->leftJoin('n.actor', 'a')
            ->where('n.recipient = :me')->setParameter('me', $this->current->get())
            ->orderBy('n.createdAt', 'DESC')->addOrderBy('n.id', 'DESC')
            ->setMaxResults(self::PAGE);
        $before = $request->query->get('before');
        if (null !== $before) {
            $date = \DateTimeImmutable::createFromFormat(\DATE_ATOM, $before) ?: throw new BadRequestHttpException('« before » est une date ISO 8601.');
            $qb->andWhere('n.createdAt < :before')->setParameter('before', $date);
        }
        /** @var list<Notification> $page */
        $page = $qb->getQuery()->getResult();

        return $this->json([
            'notifications' => array_map($this->describe(...), $page),
            'unread' => $this->unread(),
            'next' => \count($page) === self::PAGE ? end($page)->getCreatedAt()?->format(\DATE_ATOM) : null,
        ]);
    }

    #[Route('/unread-count', name: 'api_notifications_unread', methods: ['GET'])]
    public function unreadCount(): JsonResponse
    {
        return $this->json(['unread' => $this->unread()]);
    }

    #[Route('/{id}/read', name: 'api_notification_read', methods: ['POST'], requirements: ['id' => Requirement::UUID])]
    public function read(string $id): JsonResponse
    {
        $notification = $this->em->find(Notification::class, $id);
        if (null === $notification || !$notification->getRecipient()->getId()->equals($this->current->get()->getId())) {
            throw new NotFoundHttpException('Notification introuvable.');
        }
        $notification->markRead();
        $this->em->flush();

        return $this->json(['unread' => $this->unread()]);
    }

    #[Route('/read-all', name: 'api_notifications_read_all', methods: ['POST'])]
    public function readAll(): JsonResponse
    {
        $this->em->createQueryBuilder()->update(Notification::class, 'n')
            ->set('n.readAt', ':now')->where('n.recipient = :me')->andWhere('n.readAt IS NULL')
            ->setParameter('now', new \DateTimeImmutable())->setParameter('me', $this->current->get())
            ->getQuery()->execute();

        return $this->json(['unread' => 0]);
    }

    private function unread(): int
    {
        return $this->em->getRepository(Notification::class)->count(['recipient' => $this->current->get(), 'readAt' => null]);
    }

    /** @return array<string, mixed> */
    private function describe(Notification $n): array
    {
        $actor = $n->getActor();

        return [
            'id' => (string) $n->getId(),
            'type' => $n->getType()->value,
            'title' => $n->getTitle(),
            'body' => $n->getBody(),
            'data' => $n->getData(),
            'actor' => null === $actor ? null : ['id' => (string) $actor->getId(), 'displayName' => $actor->getDisplayName()],
            'createdAt' => $n->getCreatedAt()?->format(\DATE_ATOM),
            'read' => $n->isRead(),
        ];
    }
}
