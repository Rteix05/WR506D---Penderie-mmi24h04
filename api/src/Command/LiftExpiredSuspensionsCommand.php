<?php

namespace App\Command;

use App\Service\Admin\AccountModerator;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Lève les suspensions dont la durée est passée, pour tous les comptes. Une
 * suspension échue se lève déjà à la première requête du compte
 * (CurrentProfile) ; cette commande remet aussi à jour le back-office pour
 * ceux qui ne reviennent pas. À lancer chaque nuit (cron, planificateur).
 *
 *   php bin/console app:moderation:lift-expired
 */
#[AsCommand(name: 'app:moderation:lift-expired', description: 'Lève les suspensions de compte dont la durée est passée.')]
final class LiftExpiredSuspensionsCommand extends Command
{
    public function __construct(private readonly AccountModerator $moderator)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $lifted = $this->moderator->liftAllExpired();
        $io->success(0 === \count($lifted) ? 'Aucune suspension échue.' : \sprintf('%d compte(s) réactivé(s) : %s.', \count($lifted), implode(', ', array_map(static fn ($a) => $a->getUserIdentifier(), $lifted))));

        return Command::SUCCESS;
    }
}
