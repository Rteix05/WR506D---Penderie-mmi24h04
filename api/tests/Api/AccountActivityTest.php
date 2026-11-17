<?php

namespace App\Tests\Api;

use App\Entity\Identity\Account;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Le jour où un compte utilise l'app (Account::lastSeenAt), pour la carte
 * « Utilisateurs actifs » du back-office : noté à la première requête
 * authentifiée du jour, une fois.
 */
final class AccountActivityTest extends ApiTestBase
{
    private function lastSeen(string $email): ?\DateTimeImmutable
    {
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $em->clear();

        return $em->getRepository(Account::class)->findOneBy(['email' => $email])?->getLastSeenAt();
    }

    public function testAnApiCallMarksTheDay(): void
    {
        $alice = $this->signUp('alice');
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $em->createQuery('UPDATE '.Account::class.' a SET a.lastSeenAt = NULL')->execute();
        self::assertNull($this->lastSeen($alice['email']));

        $this->call('GET', '/api/me', $alice);
        self::assertResponseIsSuccessful();
        $first = $this->lastSeen($alice['email']);
        self::assertSame((new \DateTimeImmutable())->format('Y-m-d'), $first?->format('Y-m-d'));

        $this->call('GET', '/api/me', $alice);
        self::assertEquals($first, $this->lastSeen($alice['email']), 'une écriture par jour au plus');
    }

    public function testMarkSeenOncePerDay(): void
    {
        $account = new Account('bob@exemple.fr');
        self::assertTrue($account->markSeen(new \DateTimeImmutable('2026-11-15 08:00')));
        self::assertFalse($account->markSeen(new \DateTimeImmutable('2026-11-15 22:00')), 'même jour');
        self::assertTrue($account->markSeen(new \DateTimeImmutable('2026-11-16 07:00')), 'lendemain');
    }
}
