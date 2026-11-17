<?php

namespace App\Service\Scan;

/**
 * La réponse du premier modèle qui a répondu, les échecs des précédents, la
 * durée totale de la chaîne et celle du modèle qui a répondu (ms).
 */
final class VisionAnswer
{
    /**
     * @param array<string, mixed>                       $data
     * @param list<array{model: string, error: string, status?: ?int, ms?: int}> $failedAttempts
     */
    public function __construct(
        public readonly string $model,
        public readonly array $data,
        public readonly array $failedAttempts = [],
        public readonly int $durationMs = 0,
        public readonly int $modelMs = 0,
    ) {
    }
}
