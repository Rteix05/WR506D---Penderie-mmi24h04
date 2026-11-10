<?php

namespace App\Command;

use App\Entity\Identity\Account;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Ouvre (ou ferme) le back-office à un compte existant : ROLE_ADMIN est le
 * seul rôle stocké (Account::getRoles). Aucun écran ne le donne, exprès :
 * devenir administrateur passe par quelqu'un qui a accès au serveur.
 *
 *   php bin/console app:admin:grant camille@penderie.app
 *   php bin/console app:admin:grant camille@penderie.app --revoke
 *   php bin/console app:admin:grant camille@penderie.app --reset-2fa
 *
 * --reset-2fa efface le secret de la double authentification (téléphone
 * perdu) : l'administrateur la réactive à sa prochaine connexion. Retirer
 * l'accès l'efface aussi.
 */
#[AsCommand(name: 'app:admin:grant', description: 'Donne (ou retire) l\'accès au back-office à un compte existant.')]
final class GrantAdminCommand extends Command
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('email', InputArgument::REQUIRED, 'L\'e-mail du compte')
            ->addOption('revoke', null, InputOption::VALUE_NONE, 'Retirer l\'accès au lieu de le donner')
            ->addOption('reset-2fa', null, InputOption::VALUE_NONE, 'Effacer la double authentification (téléphone perdu)');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $email = mb_strtolower(trim((string) $input->getArgument('email')));
        $account = $this->em->getRepository(Account::class)->findOneBy(['email' => $email]);
        if (null === $account || $account->isGhost()) {
            $io->error(\sprintf('Aucun compte avec l\'e-mail « %s ».', $email));

            return Command::FAILURE;
        }

        if ((bool) $input->getOption('reset-2fa')) {
            $account->setTotpSecret(null);
            $this->em->flush();
            $io->success(\sprintf('Double authentification de %s effacée : elle sera réactivée à sa prochaine connexion.', $email));

            return Command::SUCCESS;
        }

        $revoke = (bool) $input->getOption('revoke');
        $roles = array_diff($account->getRoles(), [Account::ROLE_ADMIN]);
        $account->setRoles(array_values($revoke ? $roles : [...$roles, Account::ROLE_ADMIN]));
        if ($revoke) {
            $account->setTotpSecret(null);
        }
        $this->em->flush();

        $io->success($revoke ? \sprintf('%s n\'a plus accès au back-office.', $email) : \sprintf('%s a maintenant accès au back-office (/admin).', $email));

        return Command::SUCCESS;
    }
}
