<?php

namespace App\Service\Scan;

/**
 * Tous les modèles de la chaîne ont échoué (ou la clé est refusée).
 */
final class VisionUnavailable extends \RuntimeException
{
    /** @param list<array{model: string, error: string}> $attempts */
    public function __construct(string $message, public readonly array $attempts)
    {
        parent::__construct($message);
    }
}
