<?php

namespace App\Service\Moderation\Ai;

/**
 * La réponse du modèle, vérifiée : on ne garde que ce qui respecte le
 * format demandé. Un verdict inconnu, une confiance absente ou hors de
 * 0–100, un résumé vide rendent la réponse inexploitable (null) : l'analyse
 * est alors notée en échec plutôt que de deviner.
 */
final class AiVerdict
{
    public const REPORT_VERDICTS = ['DISMISS', 'WARN', 'SANCTION', 'UNSURE'];
    public const DISPUTE_VERDICTS = ['BUYER', 'SELLER', 'NONE', 'UNSURE'];
    public const SANCTIONS = ['HIDE', 'SUSPEND'];

    /**
     * @param list<string> $justification
     * @param list<string> $evidence
     */
    private function __construct(
        public readonly string $verdict,
        public readonly ?string $sanction,
        public readonly int $confidence,
        public readonly string $summary,
        public readonly array $justification,
        public readonly array $evidence,
        public readonly ?string $message,
    ) {
    }

    /** @param array<string, mixed> $data */
    public static function fromAnswer(array $data, bool $isReport): ?self
    {
        $verdict = \is_string($data['verdict'] ?? null) ? strtoupper(trim($data['verdict'])) : null;
        if (!\in_array($verdict, $isReport ? self::REPORT_VERDICTS : self::DISPUTE_VERDICTS, true)) {
            return null;
        }

        $sanction = null;
        if ('SANCTION' === $verdict) {
            $sanction = \is_string($data['sanction'] ?? null) ? strtoupper(trim($data['sanction'])) : null;
            if (!\in_array($sanction, self::SANCTIONS, true)) {
                return null;
            }
        }

        // La confiance arrive en 0–100 ou, chez certains modèles, en 0–1.
        $confidence = $data['confidence'] ?? null;
        if (!is_numeric($confidence)) {
            return null;
        }
        $confidence = (float) $confidence;
        if ($confidence > 0 && $confidence <= 1 && str_contains((string) $data['confidence'], '.')) {
            $confidence *= 100;
        }
        if ($confidence < 0 || $confidence > 100) {
            return null;
        }

        $summary = self::text($data['summary'] ?? null);
        if (null === $summary) {
            return null;
        }

        return new self(
            $verdict,
            $sanction,
            (int) round($confidence),
            $summary,
            self::lines($data['justification'] ?? []),
            self::lines($data['evidence'] ?? []),
            self::text($data['message'] ?? null),
        );
    }

    /** @return list<string> */
    private static function lines(mixed $value): array
    {
        if (\is_string($value)) {
            $value = [$value];
        }
        if (!\is_array($value)) {
            return [];
        }

        return \array_slice(array_values(array_filter(array_map(self::text(...), $value))), 0, 8);
    }

    private static function text(mixed $value): ?string
    {
        if (!\is_string($value) || '' === trim($value)) {
            return null;
        }

        return mb_substr(trim($value), 0, 1000);
    }
}
