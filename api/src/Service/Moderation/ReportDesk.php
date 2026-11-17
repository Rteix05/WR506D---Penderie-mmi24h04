<?php

namespace App\Service\Moderation;

use App\Entity\Identity\Account;
use App\Entity\Notification\ModerationAction;
use App\Entity\Notification\Notification;
use App\Entity\Notification\Report;
use App\Entity\Sharing\Post;
use App\Enum\Notification\ModerationActionType;
use App\Enum\Notification\ModerationTargetType;
use App\Enum\Notification\NotificationType;
use App\Service\Admin\AccountModerator;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Le traitement d'un signalement (maquette « Admin — Détail d'un
 * signalement ») : classer sans suite, masquer le contenu, avertir
 * l'auteur, ou suspendre son compte. Chaque décision écrit sa
 * ModerationAction (qui pointe vers le signalement) et clôt le
 * signalement, dans une transaction.
 */
final class ReportDesk
{
    public const DECISIONS = ['dismiss', 'hide', 'warn', 'suspend'];

    /** Durée d'une suspension décidée depuis un signalement (maquette : « 30 jours, réversible »). */
    private const SUSPENSION_DAYS = 30;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ReportTargets $targets,
        private readonly AccountModerator $moderator,
    ) {
    }

    public function decide(Report $report, Account $admin, string $decision, string $note): void
    {
        $note = trim($note);
        if ('' === $note || mb_strlen($note) > 1000) {
            throw new \DomainException('La note est obligatoire (1 000 caractères au plus) : elle reste dans le journal.');
        }
        if (!$report->getStatus()->isPending()) {
            throw new \DomainException('Ce signalement est déjà traité.');
        }
        $target = $this->targets->find($report->getTargetType(), (string) $report->getTargetId());
        $author = null === $target ? null : ReportTargets::authorOf($target);
        if ('dismiss' !== $decision && null === $author) {
            throw new \DomainException('Le contenu signalé n\'existe plus : classe le signalement.');
        }

        if ('suspend' === $decision) {
            \assert(null !== $author);
            // AccountModerator a sa propre transaction ; le signalement se clôt ensuite.
            $this->moderator->suspend($author->getAccount(), $admin, $note, self::SUSPENSION_DAYS, $report);
            $report->markActioned($admin, 'Compte de l\'auteur suspendu 30 jours : '.$note);
            $this->em->flush();

            return;
        }

        $this->em->wrapInTransaction(function () use ($report, $admin, $decision, $note, $target, $author): void {
            match ($decision) {
                'dismiss' => $report->dismiss($admin, $note),
                'hide' => $this->hide($report, $admin, $note, $target),
                'warn' => $this->warn($report, $admin, $note, $author),
                default => throw new \DomainException('Décision inconnue.'),
            };
        });
    }

    private function hide(Report $report, Account $admin, string $note, ?object $target): void
    {
        if (null === $target || !ReportTargets::canHide($target)) {
            throw new \DomainException('Ce contenu ne se masque pas (ou l\'est déjà) : avertis ou suspends son auteur.');
        }
        ReportTargets::hide($target);
        $action = $target instanceof Post ? ModerationActionType::DeleteContent : ModerationActionType::HideContent;
        $this->em->persist(new ModerationAction($admin, $action, $report->getTargetType(), $report->getTargetId(), $note, null, $report));
        $report->markActioned($admin, ReportTargets::hideLabel($report->getTargetType()).' : '.$note);
    }

    private function warn(Report $report, Account $admin, string $note, ?\App\Entity\Identity\Profile $author): void
    {
        \assert(null !== $author);
        $this->em->persist(new ModerationAction($admin, ModerationActionType::Warn, ModerationTargetType::Profile, $author->getId(), $note, null, $report));
        // Le message officiel, sans sanction (maquette : « Avertir l'auteur »).
        $this->em->persist(new Notification($author, NotificationType::ModerationAction, 'Avertissement de la modération', $note, ['report' => (string) $report->getId()]));
        $report->markActioned($admin, 'Auteur averti : '.$note);
    }
}
