<?php

namespace App\Tests\Api;

use App\Entity\Identity\Profile;
use App\Entity\Notification\Report;
use App\Entity\Relation\Friendship;
use App\Enum\Notification\ReportStatus;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Signaler depuis l'app (POST /api/reports) : seulement ce qu'on voit,
 * jamais son propre contenu, une fois tant que ce n'est pas traité.
 *
 * @phpstan-import-type TestUser from ApiTestBase
 */
final class ReportApiTest extends ApiTestBase
{
    /**
     * @param TestUser             $user
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>
     */
    private function report(array $user, array $body, int $expected): array
    {
        $response = $this->call('POST', '/api/reports', $user, $body);
        self::assertSame($expected, $response->getStatusCode(), (string) ($response->toArray(false)['detail'] ?? ''));

        return $response->toArray(false);
    }

    public function testReportingAProfileOnce(): void
    {
        $alice = $this->signUp('alice');
        $bruno = $this->signUp('bruno');

        $created = $this->report($bruno, ['targetType' => 'PROFILE', 'targetId' => $alice['profileId'], 'reason' => 'HARASSMENT', 'description' => 'Messages insistants'], 201);
        self::assertSame('OPEN', $created['status']);
        $report = static::getContainer()->get(EntityManagerInterface::class)->find(Report::class, $created['id']);
        self::assertSame(['bruno', 'Messages insistants', ReportStatus::Open], [$report?->getReporter()->getUsername(), $report?->getDescription(), $report?->getStatus()]);

        self::assertStringContainsString('déjà signalé', $this->report($bruno, ['targetType' => 'PROFILE', 'targetId' => $alice['profileId'], 'reason' => 'SPAM'], 409)['detail']);
        self::assertStringContainsString('propre contenu', $this->report($alice, ['targetType' => 'PROFILE', 'targetId' => $alice['profileId'], 'reason' => 'SPAM'], 422)['detail']);
    }

    public function testOnlyWhatYouCanSee(): void
    {
        $alice = $this->signUp('alice');
        $bruno = $this->signUp('bruno');
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $em->persist((new Friendship($em->find(Profile::class, $alice['profileId']), $em->find(Profile::class, $bruno['profileId'])))->accept());
        $em->flush();
        $tente = $this->call('POST', '/api/items', $alice, ['name' => 'Tente', 'room' => $this->roomOf($alice)])->toArray();

        $this->report($bruno, ['targetType' => 'ITEM', 'targetId' => $tente['id'], 'reason' => 'COUNTERFEIT'], 404);
        $this->call('POST', '/api/shares', $alice, ['targetType' => 'ITEM', 'targetId' => $tente['id'], 'audience' => 'FRIENDS']);
        self::assertResponseStatusCodeSame(201);
        $this->report($bruno, ['targetType' => 'ITEM', 'targetId' => $tente['id'], 'reason' => 'COUNTERFEIT'], 201);
    }

    public function testMalformedReports(): void
    {
        $alice = $this->signUp('alice');
        $bruno = $this->signUp('bruno');
        $this->report($bruno, ['targetType' => 'ACCOUNT', 'targetId' => $alice['profileId'], 'reason' => 'SPAM'], 400);
        $this->report($bruno, ['targetType' => 'PROFILE', 'targetId' => $alice['profileId'], 'reason' => 'BORING'], 400);
        $this->report($bruno, ['targetType' => 'PROFILE', 'targetId' => 'pas-un-uuid', 'reason' => 'SPAM'], 400);
        $this->report($bruno, ['targetType' => 'POST', 'targetId' => '01a1c0ad-51a2-710b-b5e1-ce8fbb336085', 'reason' => 'SPAM'], 404);
    }
}
