<?php

namespace App\Service\Admin;

use App\Entity\Identity\Account;
use App\Entity\Notification\ModerationAction;
use App\Entity\Notification\Report;
use App\Enum\Notification\ModerationActionType;
use App\Enum\Notification\ModerationTargetType;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;

/**
 * Suspendre ou réactiver un compte depuis le back-office, et son journal.
 *
 * Le MDD : « un compte banni n'est pas supprimé, ses profils sont
 * suspendus ». Suspendre écrit une ModerationAction BAN_ACCOUNT (le journal,
 * en écriture seule) et suspend chaque profil du compte : CurrentProfile
 * refuse alors toute requête de l'app. Réactiver écrit une action RESTORE
 * et lève les suspensions. Les deux dans la même transaction.
 *
 * Une suspension peut avoir une durée (expiresAt de l'action). Échue, elle
 * se lève toute seule : dès que le compte se présente (CurrentProfile
 * appelle liftIfExpired), ou pour tous les comptes par la commande
 * app:moderation:lift-expired. La levée est journalisée (RESTORE, au nom de
 * l'administrateur qui avait suspendu).
 */
final class AccountModerator
{
    /** Les durées proposées dans le back-office, en jours ; null : jusqu'à réactivation. */
    public const DURATIONS = [7, 30, 90];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ClockInterface $clock,
    ) {
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

    public function suspend(Account $target, Account $admin, string $reason, ?int $days = null, ?Report $report = null): void
    {
        $this->assertTarget($target, $admin);
        if ($this->isSuspended($target)) {
            throw new \DomainException('Ce compte est déjà suspendu.');
        }
        if (null !== $days && !\in_array($days, self::DURATIONS, true)) {
            throw new \DomainException('Durée de suspension inconnue.');
        }
        $until = null === $days ? null : $this->clock->now()->modify(\sprintf('+%d days', $days));
        $this->em->wrapInTransaction(function () use ($target, $admin, $reason, $until, $report): void {
            $this->em->persist(new ModerationAction($admin, ModerationActionType::BanAccount, ModerationTargetType::Account, $target->getId(), self::reason($reason), $until, $report));
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
     * La suspension en cours de ce compte (la dernière action sur le compte,
     * si c'est une suspension), ou null.
     */
    public function currentSuspension(Account $account): ?ModerationAction
    {
        $last = $this->em->getRepository(ModerationAction::class)->findOneBy(
            ['targetType' => ModerationTargetType::Account, 'targetId' => $account->getId()],
            // Les dates sont à la seconde : l'UUID v7, chronologique, départage.
            ['createdAt' => 'DESC', 'id' => 'DESC'],
        );

        return ModerationActionType::BanAccount === $last?->getActionType() ? $last : null;
    }

    /**
     * Lève la suspension de ce compte si sa durée est passée. Renvoie vrai
     * si elle a été levée.
     */
    public function liftIfExpired(Account $account): bool
    {
        $suspension = $this->currentSuspension($account);
        if (null === $suspension || $suspension->isInForce($this->clock->now()) || !$this->isSuspended($account)) {
            return false;
        }
        $this->em->wrapInTransaction(function () use ($account, $suspension): void {
            $this->em->persist(new ModerationAction(
                $suspension->getAdmin(),
                ModerationActionType::Restore,
                ModerationTargetType::Account,
                $account->getId(),
                \sprintf('Fin automatique de la suspension (jusqu\'au %s).', $suspension->getExpiresAt()?->format('d/m/Y')),
            ));
            foreach ($account->getProfiles() as $profile) {
                $profile->lift();
            }
        });

        return true;
    }

    /**
     * Lève toutes les suspensions échues (commande app:moderation:lift-expired).
     *
     * @return list<Account> les comptes réactivés
     */
    public function liftAllExpired(): array
    {
        /** @var list<Account> $suspended */
        $suspended = $this->em->createQueryBuilder()
            ->select('a')->from(Account::class, 'a')
            ->where(\sprintf('EXISTS (SELECT 1 FROM %s p WHERE p.account = a AND p.suspendedAt IS NOT NULL)', \App\Entity\Identity\Profile::class))
            ->getQuery()->getResult();

        return array_values(array_filter($suspended, $this->liftIfExpired(...)));
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
            ->orderBy('m.createdAt', 'DESC')->addOrderBy('m.id', 'DESC')
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
