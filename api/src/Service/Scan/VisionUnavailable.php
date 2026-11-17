<?php

namespace App\Service\Scan;

/**
 * Tous les modèles de la chaîne ont échoué (ou la clé est refusée).
 */
final class VisionUnavailable extends \RuntimeException
{
    /** @param list<array{model: string, error: string, status?: ?int, ms?: int}> $attempts */
    public function __construct(string $message, public readonly array $attempts, public readonly int $durationMs = 0)
    {
        parent::__construct($message);
    }
}
