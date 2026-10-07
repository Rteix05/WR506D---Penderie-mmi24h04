<?php

namespace App\Service\Scan;

/**
 * La réponse du premier modèle qui a répondu, et les échecs des précédents.
 */
final class VisionAnswer
{
    /**
     * @param array<string, mixed>                       $data
     * @param list<array{model: string, error: string}> $failedAttempts
     */
    public function __construct(
        public readonly string $model,
        public readonly array $data,
        public readonly array $failedAttempts = [],
    ) {
    }
}
