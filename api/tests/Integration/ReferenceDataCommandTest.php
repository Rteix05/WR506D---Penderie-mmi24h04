<?php

namespace App\Tests\Integration;

use App\ReferenceData\Colors;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Component\Console\Tester\CommandTester;

/**
 * app:reference-data:load est idempotente : relancée sur une base déjà
 * remplie (celle des tests), elle ne crée rien et réussit.
 */
final class ReferenceDataCommandTest extends DatabaseTestCase
{
    public function testReloadingChangesNothing(): void
    {
        $tester = new CommandTester((new Application(self::$kernel))->find('app:reference-data:load'));

        self::assertSame(0, $tester->execute([]));
        self::assertStringContainsString('Référentiels à jour', $tester->getDisplay());
        // Colonnes : table, créées, mises à jour (toutes les lignes sont réécrites, aucune n'est créée).
        self::assertMatchesRegularExpression('/color\s+0\s+'.\count(Colors::all()).'\s/', $tester->getDisplay(), 'aucune couleur créée en double');
    }
}
