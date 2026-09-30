<?php

namespace App\Tests\Unit;

use App\Util\Money;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class MoneyTest extends TestCase
{
    /** @return iterable<string, array{string, int}> */
    public static function amounts(): iterable
    {
        yield 'entier' => ['12', 1200];
        yield 'une décimale' => ['12.5', 1250];
        yield 'deux décimales' => ['12.50', 1250];
        yield 'centimes' => ['0.05', 5];
        yield 'négatif' => ['-3.20', -320];
    }

    #[DataProvider('amounts')]
    public function testConvertsToCents(string $amount, int $cents): void
    {
        self::assertSame($cents, Money::toCents($amount));
    }

    public function testFormatsCents(): void
    {
        self::assertSame('12.50', Money::fromCents(1250));
        self::assertSame('0.05', Money::fromCents(5));
        self::assertSame('-0.05', Money::fromCents(-5));
    }

    public function testAddsWithoutFloatError(): void
    {
        // 0.1 + 0.2 en float donne 0.30000000000000004.
        self::assertSame('0.30', Money::add('0.10', '0.20'));
        self::assertSame('156.90', Money::add('150.00', '6.90'));
    }

    public function testCompares(): void
    {
        self::assertSame(1, Money::compare('10.01', '10'));
        self::assertSame(0, Money::compare('10', '10.00'));
        self::assertSame(-1, Money::compare('9.99', '10'));
    }

    public function testRejectsMalformedAmount(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Money::toCents('12,50');
    }
}
