<?php

namespace App\Controller\Moderation;

use App\Entity\Identity\Profile;
use App\Entity\Notification\Report;
use App\Entity\Sharing\Comment;
use App\Enum\Notification\ModerationTargetType;
use App\Enum\Notification\ReportReason;
use App\Enum\Notification\ReportStatus;
use App\Security\CurrentProfile;
use App\Service\Moderation\ReportTargets;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

/**
 * Signaler depuis l'app : POST /api/reports
 * {targetType, targetId, reason, description?}.
 *
 * targetType : PROFILE, ITEM, GARMENT, COMMENT, LISTING, COLLECTION, POST ;
 * reason : SPAM, INAPPROPRIATE, COUNTERFEIT, HARASSMENT, OTHER.
 *
 * On ne signale que ce qu'on voit (404 sinon : pas d'indice sur l'existence
 * d'un contenu privé), jamais son propre contenu ni celui de son compte
 * (422), et une seule fois tant que le premier signalement n'est pas
 * traité (409). Le traitement se fait dans le back-office.
 */
final class ReportController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CurrentProfile $current,
        private readonly ReportTargets $targets,
    ) {
    }

    #[Route('/api/reports', name: 'api_report_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $me = $this->current->get();
        $body = $request->toArray();
        $type = \is_string($body['targetType'] ?? null) ? ModerationTargetType::tryFrom($body['targetType']) : null;
        if (null === $type || ModerationTargetType::Account === $type) {
            throw new BadRequestHttpException('« targetType » vaut PROFILE, ITEM, GARMENT, COMMENT, LISTING, COLLECTION ou POST.');
        }
        $reason = \is_string($body['reason'] ?? null) ? ReportReason::tryFrom($body['reason']) : null;
        if (null === $reason) {
            throw new BadRequestHttpException('« reason » vaut SPAM, INAPPROPRIATE, COUNTERFEIT, HARASSMENT ou OTHER.');
        }
        $id = $body['targetId'] ?? null;
        if (!\is_string($id) || !Uuid::isValid($id)) {
            throw new BadRequestHttpException('« targetId » est l\'identifiant du contenu signalé.');
        }
        $description = $body['description'] ?? null;
        if (null !== $description && !\is_string($description)) {
            throw new BadRequestHttpException('« description » est un texte.');
        }

        $target = $this->targets->find($type, $id);
        if (null === $target || !$this->visible($target)) {
            throw new NotFoundHttpException('Contenu introuvable.');
        }
        $author = ReportTargets::authorOf($target);
        if (null !== $author && $author->getAccount()->getId()->equals($me->getAccount()->getId())) {
            throw new UnprocessableEntityHttpException('On ne signale pas son propre contenu.');
        }
        $pending = $this->em->getRepository(Report::class)->findOneBy([
            'reporter' => $me, 'targetType' => $type, 'targetId' => Uuid::fromString($id), 'status' => [ReportStatus::Open, ReportStatus::UnderReview],
        ]);
        if (null !== $pending) {
            throw new ConflictHttpException('Tu as déjà signalé ce contenu : la modération va l\'examiner.');
        }

        $report = new Report($me, $type, Uuid::fromString($id), $reason, $description);
        $this->em->persist($report);
        $this->em->flush();

        return $this->json(['id' => (string) $report->getId(), 'status' => $report->getStatus()->value], Response::HTTP_CREATED);
    }

    /**
     * Ce que le profil actif voit : un autre profil existe pour tous ; un
     * commentaire visible (ni supprimé ni masqué) ; le reste selon les
     * droits habituels (VIEW).
     */
    private function visible(object $target): bool
    {
        return match (true) {
            $target instanceof Profile => !$target->isGhost(),
            $target instanceof Comment => $target->isVisible(),
            default => $this->isGranted('VIEW', $target),
        };
    }
}
