<?php

namespace App\Tests\Unit;

use App\Service\Dressing\LookTagDetector;
use PHPUnit\Framework\TestCase;

/**
 * Le contour rendu par les modèles : en fractions comme demandé, mais
 * certains répondent en pourcentages ou sur 1 000.
 */
final class LookTagBoxTest extends TestCase
{
    public function testReadsFractionsPercentagesAndThousandths(): void
    {
        $expected = ['x0' => 0.1, 'y0' => 0.2, 'x1' => 0.6, 'y1' => 0.9];

        self::assertEqualsWithDelta($expected, LookTagDetector::box([0.1, 0.2, 0.6, 0.9]), 0.0001);
        self::assertEqualsWithDelta($expected, LookTagDetector::box([10, 20, 60, 90]), 0.0001);
        self::assertEqualsWithDelta($expected, LookTagDetector::box([100, 200, 600, 900]), 0.0001);
        self::assertEqualsWithDelta($expected, LookTagDetector::box(['0.1', '0.2', '0.6', '0.9']), 0.0001);
    }

    public function testRejectsWhatIsNotARectangle(): void
    {
        self::assertNull(LookTagDetector::box(null));
        self::assertNull(LookTagDetector::box('0.1, 0.2, 0.6, 0.9'));
        self::assertNull(LookTagDetector::box([0.1, 0.2, 0.6]));
        self::assertNull(LookTagDetector::box([0.1, -0.2, 0.6, 0.9]));
        self::assertNull(LookTagDetector::box([0.6, 0.2, 0.1, 0.9]), 'gauche après droite');
        self::assertNull(LookTagDetector::box([0.5, 0.5, 0.5, 0.5]), 'un point, pas un rectangle');
    }
}
