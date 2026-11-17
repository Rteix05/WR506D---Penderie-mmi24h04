<?php

namespace App\Command;

use App\Entity\Moderation\AiReview;
use App\Entity\Notification\Report;
use App\Entity\Sale\Dispute;
use App\Enum\Moderation\AiReviewStatus;
use App\Enum\Notification\ReportStatus;
use App\Enum\Sale\DisputeStatus;
use App\Service\Moderation\Ai\AiModerator;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * La pipeline de pré-analyse IA : passe les signalements à traiter et les
 * litiges ouverts qui n'ont pas encore d'analyse (ou dont la dernière a
 * échoué, avec --retry-failed), du plus ancien au plus récent. À lancer
 * toutes les quelques minutes (cron, planificateur) ; l'administrateur peut
 * aussi lancer l'analyse d'un dossier depuis sa page.
 *
 *   php bin/console app:moderation:ai-review
 *   php bin/console app:moderation:ai-review --limit=5 --retry-failed
 *
 * Les modèles gratuits d'OpenRouter sont limités (≈ 20 requêtes/minute) :
 * --limit borne le nombre de dossiers par passage.
 */
#[AsCommand(name: 'app:moderation:ai-review', description: 'Pré-analyse par l\'IA les signalements et litiges en attente.')]
final class AiReviewCommand extends Command
{
    /**
     * Secondes laissées aux modèles par dossier. Hors requête web, pas de
     * limite de 30 s : les modèles lents (raisonnement) ont le temps de finir.
     */
    private const BUDGET = 90.0;

    public function __construct(
        private readonly AiModerator $ai,
        private readonly EntityManagerInterface $em,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('limit', null, InputOption::VALUE_REQUIRED, 'Nombre de dossiers au plus par passage', '10')
            ->addOption('retry-failed', null, InputOption::VALUE_NONE, 'Repasser les dossiers dont la dernière analyse a échoué');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $limit = max(1, (int) $input->getOption('limit'));
        $retry = (bool) $input->getOption('retry-failed');

        $subjects = [
            ...$this->pending(Report::class, 'report', [ReportStatus::Open], $retry, $limit),
            ...$this->pending(Dispute::class, 'dispute', [DisputeStatus::Open, DisputeStatus::UnderReview], $retry, $limit),
        ];
        usort($subjects, static fn (Report|Dispute $a, Report|Dispute $b) => $a->getCreatedAt() <=> $b->getCreatedAt());
        $subjects = \array_slice($subjects, 0, $limit);

        if ([] === $subjects) {
            $io->success('Rien à analyser.');

            return Command::SUCCESS;
        }

        $tally = [];
        foreach ($subjects as $subject) {
            $review = $this->ai->review($subject, budget: self::BUDGET);
            $status = $review->getStatus()->value;
            $tally[$status] = ($tally[$status] ?? 0) + 1;
            $io->writeln(\sprintf(
                '%s %s → %s%s (%d ms%s)',
                $subject instanceof Report ? 'Signalement' : 'Litige',
                substr((string) $subject->getId(), -6),
                $status,
                null === $review->getVerdict() ? '' : ' · '.$review->getVerdict().' '.$review->getConfidence().' %',
                $review->getDurationMs(),
                null === $review->getModel() ? '' : ', '.$review->getModel(),
            ));
        }
        $io->success(\sprintf('%d dossier(s) analysé(s) : %s.', \count($subjects), implode(', ', array_map(static fn ($k, $v) => "$k $v", array_keys($tally), $tally))));

        return Command::SUCCESS;
    }

    /**
     * Les dossiers en attente sans analyse (ou, avec $retry, dont la
     * dernière analyse a échoué).
     *
     * @template T of Report|Dispute
     *
     * @param class-string<T> $class
     * @param list<\BackedEnum> $statuses
     *
     * @return list<T>
     */
    private function pending(string $class, string $field, array $statuses, bool $retry, int $limit): array
    {
        $noReview = \sprintf('NOT EXISTS (SELECT 1 FROM %s r WHERE r.%s = x)', AiReview::class, $field);
        $onlyFailed = \sprintf(
            'NOT EXISTS (SELECT 1 FROM %s r2 WHERE r2.%s = x AND r2.status != :failed)',
            AiReview::class,
            $field,
        );

        $qb = $this->em->createQueryBuilder()->select('x')->from($class, 'x')
            ->where('x.status IN (:statuses)')->setParameter('statuses', $statuses)
            ->orderBy('x.createdAt', 'ASC')->setMaxResults($limit);
        if ($retry) {
            $qb->andWhere($onlyFailed)->setParameter('failed', AiReviewStatus::Failed);
        } else {
            $qb->andWhere($noReview);
        }

        /** @var list<T> */
        return $qb->getQuery()->getResult();
    }
}
