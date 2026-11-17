<?php

namespace App\Command;

use App\Entity\Loan\Loan;
use App\Enum\Loan\LoanStatus;
use App\Enum\Notification\NotificationType;
use App\Service\Notification\Notifier;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Les rappels de prêt (maquette : « Rappel de retour », « Prêt en
 * retard »), à lancer une fois par jour (cron, planificateur) :
 *
 *   php bin/console app:loans:remind
 *
 *  - la veille de la date de retour : LOAN_DUE_SOON, à l'emprunteur
 *    (« à rendre demain ») et au prêteur (« revient demain ») ;
 *  - en retard : LOAN_OVERDUE aux deux, le lendemain de la date puis à
 *    3, 7, 14 et 30 jours de retard — pas tous les jours, pour ne pas
 *    harceler.
 *
 * Chaque rappel porte sa clé (data.reminder) : relancer la commande le
 * même jour n'envoie rien deux fois. Les rappels partent aussi en push
 * (PushOnNotificationSubscriber, à la fin de la commande).
 */
#[AsCommand(name: 'app:loans:remind', description: 'Envoie les rappels de retour et de retard des prêts en cours.')]
final class LoanRemindersCommand extends Command
{
    private const OVERDUE_DAYS = [1, 3, 7, 14, 30];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly Notifier $notifier,
        private readonly ClockInterface $clock,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $today = $this->clock->now()->setTime(0, 0);
        /** @var list<Loan> $loans */
        $loans = $this->em->createQueryBuilder()->select('l')->from(Loan::class, 'l')
            ->where('l.status = :active')->andWhere('l.dueDate IS NOT NULL')->andWhere('l.dueDate <= :tomorrow')
            ->setParameter('active', LoanStatus::Active)->setParameter('tomorrow', $today->modify('+1 day'))
            ->getQuery()->getResult();

        $sent = 0;
        foreach ($loans as $loan) {
            $due = $loan->getDueDate()?->setTime(0, 0);
            if (null === $due) {
                continue;
            }
            $late = (int) $due->diff($today)->format('%r%a');
            $name = $loan->getPossession()->getName();
            $lender = $loan->getLender();
            $borrower = $loan->getBorrower();

            if (-1 === $late) {
                $key = 'due-'.$due->format('Y-m-d');
                $sent += $this->remind($loan, $borrower, NotificationType::LoanDueSoon, $key, 'Rappel de retour', \sprintf('« %s » de %s est à rendre demain.', $name, $lender->getDisplayName()));
                $sent += $this->remind($loan, $lender, NotificationType::LoanDueSoon, $key, 'Rappel de retour', \sprintf('« %s » prêté à %s revient demain.', $name, $borrower->getDisplayName()));
            } elseif (\in_array($late, self::OVERDUE_DAYS, true)) {
                $key = 'late-'.$late;
                $days = 1 === $late ? 'depuis hier' : \sprintf('depuis %d jours', $late);
                $sent += $this->remind($loan, $borrower, NotificationType::LoanOverdue, $key, 'Prêt en retard', \sprintf('« %s » de %s devait revenir le %s : %s de retard.', $name, $lender->getDisplayName(), $due->format('d/m'), $days));
                $sent += $this->remind($loan, $lender, NotificationType::LoanOverdue, $key, 'Prêt en retard', \sprintf('« %s » prêté à %s devait revenir le %s (%s).', $name, $borrower->getDisplayName(), $due->format('d/m'), $days));
            }
        }
        $this->em->flush();
        $io->success(\sprintf('%d rappel(s) envoyé(s) pour %d prêt(s) à échéance ou en retard.', $sent, \count($loans)));

        return Command::SUCCESS;
    }

    private function remind(Loan $loan, \App\Entity\Identity\Profile $to, NotificationType $type, string $key, string $title, string $body): int
    {
        $already = (int) $this->em->getConnection()->fetchOne(
            "SELECT COUNT(*) FROM notification WHERE recipient_id = :to AND type = :type AND data->>'loan' = :loan AND data->>'reminder' = :key",
            ['to' => (string) $to->getId(), 'type' => $type->value, 'loan' => (string) $loan->getId(), 'key' => $key],
        );
        if ($already > 0) {
            return 0;
        }

        return null === $this->notifier->notify($to, $type, $title, $body, ['loan' => (string) $loan->getId(), 'reminder' => $key]) ? 0 : 1;
    }
}
