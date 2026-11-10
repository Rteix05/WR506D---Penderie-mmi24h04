<?php

namespace App\Service\Admin;

use App\Entity\Identity\Account;
use App\Entity\Notification\ModerationAction;
use App\Enum\Notification\ModerationActionType;
use App\Enum\Notification\ModerationTargetType;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Suspendre ou réactiver un compte depuis le back-office, et son journal.
 *
 * Le MDD : « un compte banni n'est pas supprimé, ses profils sont
 * suspendus ». Suspendre écrit une ModerationAction BAN_ACCOUNT (le journal,
 * en écriture seule) et suspend chaque profil du compte : CurrentProfile
 * refuse alors toute requête de l'app. Réactiver écrit une action RESTORE
 * et lève les suspensions. Les deux dans la même transaction.
 */
final class AccountModerator
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public function isSuspended(Account $account): bool
    {
        foreach ($account->getProfiles() as $profile) {
            if (null !== $profile->getSuspendedAt()) {
                return true;
            }
        }

        return false;
    }

    public function suspend(Account $target, Account $admin, string $reason): void
    {
        $this->assertTarget($target, $admin);
        if ($this->isSuspended($target)) {
            throw new \DomainException('Ce compte est déjà suspendu.');
        }
        $this->em->wrapInTransaction(function () use ($target, $admin, $reason): void {
            $this->em->persist(new ModerationAction($admin, ModerationActionType::BanAccount, ModerationTargetType::Account, $target->getId(), self::reason($reason)));
            foreach ($target->getProfiles() as $profile) {
                $profile->suspend();
            }
        });
    }

    public function reinstate(Account $target, Account $admin, string $reason): void
    {
        $this->assertTarget($target, $admin);
        if (!$this->isSuspended($target)) {
            throw new \DomainException('Ce compte n\'est pas suspendu.');
        }
        $this->em->wrapInTransaction(function () use ($target, $admin, $reason): void {
            $this->em->persist(new ModerationAction($admin, ModerationActionType::Restore, ModerationTargetType::Account, $target->getId(), self::reason($reason)));
            foreach ($target->getProfiles() as $profile) {
                $profile->lift();
            }
        });
    }

    /**
     * Ce que la modération a fait sur ce compte et sur ses profils, du plus
     * récent au plus ancien.
     *
     * @return list<ModerationAction>
     */
    public function history(Account $account): array
    {
        $ids = [$account->getId()];
        foreach ($account->getProfiles() as $profile) {
            $ids[] = $profile->getId();
        }

        /** @var list<ModerationAction> */
        return $this->em->createQueryBuilder()
            ->select('m')->from(ModerationAction::class, 'm')
            ->where('m.targetType IN (:types)')->andWhere('m.targetId IN (:ids)')
            ->setParameter('types', [ModerationTargetType::Account, ModerationTargetType::Profile])
            ->setParameter('ids', array_map(static fn ($id) => $id->toRfc4122(), $ids))
            ->orderBy('m.createdAt', 'DESC')
            ->getQuery()->getResult();
    }

    private function assertTarget(Account $target, Account $admin): void
    {
        if ($target->isGhost()) {
            throw new \DomainException('Le compte fantôme ne se modère pas.');
        }
        if ($target->getId()->equals($admin->getId())) {
            throw new \DomainException('On ne se suspend pas soi-même.');
        }
    }

    private static function reason(string $reason): string
    {
        $reason = trim($reason);
        if ('' === $reason || mb_strlen($reason) > 500) {
            throw new \DomainException('Le motif est obligatoire (500 caractères au plus) : il reste dans le journal.');
        }

        return $reason;
    }
}
