<?php

namespace App\Util;

/**
 * Calculs sur des montants decimal(10,2) manipulés en chaîne (« 12.50 »).
 *
 * Tout passe par des centimes entiers : jamais de float, donc jamais
 * d'arrondi perdu. Évite d'ajouter l'extension bcmath à l'image PHP.
 */
final class Money
{
    public static function toCents(string $amount): int
    {
        if (!preg_match('/^(-?)(\d+)(?:\.(\d{1,2}))?$/', trim($amount), $m)) {
            throw new \InvalidArgumentException(\sprintf('Montant invalide : « %s ».', $amount));
        }
        $cents = (int) $m[2] * 100 + (int) str_pad($m[3] ?? '0', 2, '0');

        return '-' === $m[1] ? -$cents : $cents;
    }

    public static function fromCents(int $cents): string
    {
        $sign = $cents < 0 ? '-' : '';
        $cents = abs($cents);

        return \sprintf('%s%d.%02d', $sign, intdiv($cents, 100), $cents % 100);
    }

    public static function add(string $a, string $b): string
    {
        return self::fromCents(self::toCents($a) + self::toCents($b));
    }

    /** -1, 0 ou 1, comme <=>. */
    public static function compare(string $a, string $b): int
    {
        return self::toCents($a) <=> self::toCents($b);
    }
}
