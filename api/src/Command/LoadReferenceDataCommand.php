<?php

namespace App\Command;

use App\ReferenceData\ReferenceDataLoader;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:reference-data:load',
    description: 'Charge ou met à jour les référentiels (catégories, tailles, marques, couleurs, styles). Idempotent.',
)]
final class LoadReferenceDataCommand extends Command
{
    public function __construct(private readonly ReferenceDataLoader $loader)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $rows = [];
        foreach ($this->loader->load() as $table => $counts) {
            $rows[] = [$table, $counts['created'], $counts['updated']];
        }
        $io->table(['Table', 'Créées', 'Mises à jour'], $rows);
        $io->success('Référentiels à jour.');

        return Command::SUCCESS;
    }
}
