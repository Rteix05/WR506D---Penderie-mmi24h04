<?php

namespace App\Tests\Unit;

use App\Enum\Dressing\Weather;
use App\Service\Outfit\Forecast;
use App\Service\Outfit\OutfitCandidate;
use App\Service\Outfit\OutfitEngine;
use App\Service\Outfit\Piece;
use App\Service\Outfit\WeatherProvider;
use PHPUnit\Framework\TestCase;

/**
 * Les règles du moteur de suggestion, sans base : composer, respecter
 * l'occasion et la météo, varier, accorder les couleurs.
 */
final class OutfitEngineTest extends TestCase
{
    private OutfitEngine $engine;

    protected function setUp(): void
    {
        $this->engine = new OutfitEngine();
    }

    /** @param list<string> $colors */
    private static function piece(string $id, string $slot, string $category, int $warmth = 3, string $usage = 'EVERYDAY', array $colors = ['BLACK'], ?int $worn = null, bool $water = false): Piece
    {
        return new Piece($id, ucfirst($id), $slot, $category, $category, $warmth, $water, $usage, $colors, [], [], [], $worn);
    }

    /** @return list<Piece> */
    private function wardrobe(): array
    {
        return [
            self::piece('tshirt', 'top', 't-shirts', 2, colors: ['WHITE']),
            self::piece('pull', 'top', 'pulls', 4, colors: ['GREY']),
            self::piece('jean', 'bottom', 'jeans', 3, colors: ['BLUE']),
            self::piece('short', 'bottom', 'shorts', 1, colors: ['BEIGE']),
            self::piece('jogging', 'bottom', 'joggings', 3, 'SPORT'),
            self::piece('baskets', 'shoes', 'baskets', 3, colors: ['WHITE']),
            self::piece('sandales', 'shoes', 'sandales', 1, colors: ['BROWN']),
            self::piece('veste', 'outer', 'vestes', 3, colors: ['BLUE']),
            self::piece('manteau', 'outer', 'manteaux', 5),
            self::piece('impermeable', 'outer', 'impermeables', 3, colors: ['YELLOW'], water: true),
        ];
    }

    private static function forecast(int $t, Weather $w = Weather::Cloudy): Forecast
    {
        return new Forecast($t, $t - 2, $t + 3, $w, Weather::Rain === $w ? 90 : 10);
    }

    /**
     * @param list<OutfitCandidate> $candidates
     *
     * @return list<string>
     */
    private static function ids(array $candidates): array
    {
        return array_map(static fn (Piece $p) => $p->id, $candidates[0]->pieces);
    }

    public function testACoolDayGivesAJacketAndClosedShoes(): void
    {
        $best = self::ids($this->engine->candidates($this->wardrobe(), 'EVERYDAY', self::forecast(12)));

        self::assertContains('jean', $best, 'pas de short à 12 °C');
        self::assertContains('baskets', $best, 'pas de sandales à 12 °C');
        self::assertContains('veste', $best, 'une veste suffit à 12 °C, pas besoin de manteau');
        self::assertSame('veste', $best[0], 'la couche du dessus s\'affiche en premier (en grand)');
    }

    public function testFreezingGivesTheCoatAndTheJumper(): void
    {
        $best = self::ids($this->engine->candidates($this->wardrobe(), 'EVERYDAY', self::forecast(-2)));

        self::assertContains('manteau', $best);
        self::assertContains('pull', $best);
    }

    public function testRainCallsForTheRaincoat(): void
    {
        self::assertContains('impermeable', self::ids($this->engine->candidates($this->wardrobe(), 'EVERYDAY', self::forecast(14, Weather::Rain))));
    }

    public function testAHotDayNeedsNoOuterLayer(): void
    {
        $best = self::ids($this->engine->candidates($this->wardrobe(), 'EVERYDAY', self::forecast(29, Weather::Sunny)));

        self::assertContains('short', $best);
        self::assertContains('tshirt', $best);
        self::assertEmpty(array_intersect(['veste', 'manteau', 'impermeable'], $best));
    }

    public function testNoSportswearForWork(): void
    {
        foreach ($this->engine->candidates($this->wardrobe(), 'WORK', self::forecast(15)) as $candidate) {
            self::assertNotContains('jogging', array_map(static fn (Piece $p) => $p->id, $candidate->pieces), 'jamais de jogging pour aller travailler');
        }
    }

    public function testEveningWearOnlyAtNight(): void
    {
        $robe = self::piece('robe-soiree', 'dress', 'robes', 2, 'EVENING');

        self::assertFalse($this->engine->allowed($robe, 'WORK'), 'pas de robe de soirée au bureau');
        self::assertFalse($this->engine->allowed($robe, 'EVERYDAY'));
        self::assertTrue($this->engine->allowed($robe, 'EVENING'));
    }

    public function testWhatWasWornYesterdayStepsAside(): void
    {
        $wardrobe = [
            self::piece('jean', 'bottom', 'jeans', worn: 1),
            self::piece('pantalon', 'bottom', 'pantalons'),
            self::piece('tshirt', 'top', 't-shirts', 2, colors: ['WHITE']),
        ];

        self::assertContains('pantalon', self::ids($this->engine->candidates($wardrobe, 'EVERYDAY', self::forecast(20))));
    }

    public function testCandidatesDifferAndAvoidListIsHonoured(): void
    {
        $candidates = $this->engine->candidates($this->wardrobe(), 'EVERYDAY', self::forecast(12));
        $mains = array_map(static fn ($c) => $c->mainIds(), $candidates);
        self::assertCount(\count($mains), array_unique(array_map('serialize', $mains)), 'chaque candidate change une pièce principale');

        $next = self::ids($this->engine->candidates($this->wardrobe(), 'EVERYDAY', self::forecast(12), avoid: ['jean']));
        self::assertNotContains('jean', $next, '« Nouvelle tenue » écarte les pièces de la précédente');
    }

    public function testColourHarmony(): void
    {
        self::assertSame('neutral', $this->engine->harmony([self::piece('a', 'top', 't-shirts', colors: ['WHITE']), self::piece('b', 'bottom', 'jeans', colors: ['BLUE'])])[1], 'le bleu d\'un jean est neutre');
        self::assertSame('oneAccent', $this->engine->harmony([self::piece('a', 'top', 't-shirts', colors: ['RED']), self::piece('b', 'bottom', 'jeans', colors: ['BLACK'])])[1]);
        self::assertSame('busy', $this->engine->harmony([self::piece('a', 'top', 't-shirts', colors: ['RED']), self::piece('b', 'bottom', 'jeans', colors: ['GREEN']), self::piece('c', 'shoes', 'baskets', colors: ['YELLOW'])])[1]);
    }

    public function testNothingToWearGivesNoCandidate(): void
    {
        self::assertSame([], $this->engine->candidates([self::piece('baskets', 'shoes', 'baskets')], 'EVERYDAY', null));
    }

    public function testSlotsFromCategories(): void
    {
        self::assertSame('top', OutfitEngine::slot('pulls', 'hauts'));
        self::assertSame('dress', OutfitEngine::slot('costumes-complets', 'costumes'));
        self::assertSame('outer', OutfitEngine::slot('enfant-manteaux', 'enfant'));
        self::assertNull(OutfitEngine::slot('chaussons', 'chaussures'), 'on ne sort pas en chaussons');
        self::assertNull(OutfitEngine::slot('sacs', 'accessoires'));
    }

    public function testWeatherHelpers(): void
    {
        self::assertSame('Troyes', WeatherProvider::cityOf('12 rue Émile Zola, 10000 Troyes'));
        self::assertSame('Paris', WeatherProvider::cityOf("3 place X\n75011 Paris, France"));
        self::assertSame(Weather::Sunny, WeatherProvider::weather(0));
        self::assertSame(Weather::Rain, WeatherProvider::weather(61));
        self::assertSame(Weather::Snow, WeatherProvider::weather(73));
        self::assertSame(Weather::Wind, WeatherProvider::weather(2, 55));
    }
}
