<?php

namespace App\Tests\Integration;

use App\Entity\Identity\Account;
use App\Entity\Notification\ModerationAction;
use App\Enum\Notification\ModerationActionType;
use App\Service\Admin\AccountModerator;
use Symfony\Component\Clock\MockClock;

/**
 * La durée d'une suspension (AccountModerator) : échue, elle se lève toute
 * seule et la levée est journalisée ; « jusqu'à réactivation », jamais.
 * L'horloge du service est simulée (MockClock) : le journal refuse, lui,
 * une date de fin dans le passé.
 */
final class SuspensionTest extends DatabaseTestCase
{
    private function moderator(string $now = 'now'): AccountModerator
    {
        return new AccountModerator($this->em, new MockClock(new \DateTimeImmutable($now)));
    }

    /**
     * Relit les comptes en base : un profil créé ici ne s'ajoute pas à la
     * collection de son compte (côté inverse), la suspension n'en verrait
     * aucun.
     *
     * @param list<Account> $accounts
     *
     * @return list<Account>
     */
    private function reload(array $accounts): array
    {
        $ids = array_map(static fn (Account $a) => $a->getId(), $accounts);
        $this->em->clear();

        return array_map(fn ($id) => $this->em->find(Account::class, $id), $ids);
    }

    /** @return list<ModerationActionType> */
    private function journal(Account $account): array
    {
        return array_map(
            static fn (ModerationAction $a) => $a->getActionType(),
            $this->em->getRepository(ModerationAction::class)->findBy(['targetId' => $account->getId()], ['createdAt' => 'ASC', 'id' => 'ASC']),
        );
    }

    public function testASuspensionEndsOnItsOwn(): void
    {
        $mathis = $this->profile('mathis');
        $this->child('leo', $mathis);
        [$account, $admin] = $this->reload([$mathis->getAccount(), $this->admin()]);
        $profiles = $account->getProfiles()->toArray();
        self::assertCount(2, $profiles);
        $this->moderator()->suspend($account, $admin, 'Spam', days: 7);

        $suspension = $this->moderator()->currentSuspension($account);
        self::assertNotNull($suspension?->getExpiresAt());
        self::assertSame((new \DateTimeImmutable('+7 days'))->format('Y-m-d'), $suspension->getExpiresAt()->format('Y-m-d'));

        self::assertFalse($this->moderator('+3 days')->liftIfExpired($account), 'encore 4 jours');
        foreach ($profiles as $p) {
            self::assertNotNull($p->getSuspendedAt());
        }

        self::assertTrue($this->moderator('+8 days')->liftIfExpired($account));
        foreach ($profiles as $p) {
            self::assertNull($p->getSuspendedAt(), 'tous les profils du compte');
        }
        self::assertSame([ModerationActionType::BanAccount, ModerationActionType::Restore], $this->journal($account));
        self::assertStringStartsWith('Fin automatique de la suspension', $this->em->getRepository(ModerationAction::class)->findOneBy(['actionType' => ModerationActionType::Restore])?->getReason() ?? '');
        self::assertFalse($this->moderator('+9 days')->liftIfExpired($account), 'une seule levée');
    }

    public function testUntilReinstatedNeverEnds(): void
    {
        [$account, $admin] = $this->reload([$this->profile('mathis')->getAccount(), $this->admin()]);
        $this->moderator()->suspend($account, $admin, 'Fraude');

        self::assertNull($this->moderator()->currentSuspension($account)?->getExpiresAt());
        self::assertFalse($this->moderator('+10 years')->liftIfExpired($account));
        self::assertTrue($this->moderator()->isSuspended($account));
    }

    public function testTheNightlyCommandLiftsOnlyWhatIsDue(): void
    {
        [$due, $later, $admin] = $this->reload([$this->profile('due')->getAccount(), $this->profile('later')->getAccount(), $this->admin()]);
        $this->moderator()->suspend($due, $admin, 'Spam', days: 7);
        $this->moderator()->suspend($later, $admin, 'Spam', days: 30);

        self::assertSame([$due], $this->moderator('+8 days')->liftAllExpired());
        self::assertFalse($this->moderator()->isSuspended($due));
        self::assertTrue($this->moderator()->isSuspended($later));
    }

    public function testOnlyTheOfferedDurations(): void
    {
        [$account, $admin] = $this->reload([$this->profile('mathis')->getAccount(), $this->admin()]);
        $this->expectExceptionMessage('Durée de suspension inconnue.');
        $this->moderator()->suspend($account, $admin, 'Spam', days: 3);
    }
}
