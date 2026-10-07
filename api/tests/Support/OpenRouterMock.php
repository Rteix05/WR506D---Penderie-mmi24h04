<?php

namespace App\Tests\Support;

use Symfony\Component\HttpClient\Response\MockResponse;
use Symfony\Contracts\HttpClient\ResponseInterface;

/**
 * Un faux OpenRouter pour les tests fonctionnels : le premier modèle de la
 * chaîne est toujours « à court de quota » (429), ce qui fait passer chaque
 * scan par le fallback ; le suivant répond selon la consigne (photo ou
 * étiquette). Avec $down, tous les modèles sont en panne.
 */
final class OpenRouterMock
{
    public static bool $down = false;

    /** @param array<string, mixed> $options */
    public function __invoke(string $method, string $url, array $options): ResponseInterface
    {
        $request = json_decode($options['body'] ?? '{}', true);
        $model = $request['model'] ?? '';
        if (self::$down || str_starts_with($model, 'google/gemma-4-31b')) {
            return new MockResponse(json_encode(['error' => ['code' => 429, 'message' => 'Rate limit exceeded: free-models-per-min']]), ['http_code' => 429]);
        }
        $prompt = $request['messages'][0]['content'][0]['text'] ?? '';
        $answer = str_contains($prompt, 'étiquette cousue')
            ? ['type' => 'GARMENT', 'name' => null, 'brand' => 'Levi\'s', 'size' => 'W32 L34', 'colors' => [],
                'composition' => [['material' => 'coton', 'percent' => 99], ['material' => 'élasthanne', 'percent' => 1]],
                'care' => ['lavage à 30 °C'], 'madeIn' => 'Turquie', 'confidence' => 0.9]
            : ['type' => 'GARMENT', 'name' => 'Jean slim bleu', 'description' => 'Un jean bleu brut.', 'category' => 'jeans',
                'brand' => null, 'colors' => ['Bleu marine', 'Couleur inventée'], 'size' => null, 'composition' => [], 'care' => [], 'confidence' => 0.8];

        return new MockResponse(json_encode([
            'model' => $model,
            'choices' => [['message' => ['role' => 'assistant', 'content' => "```json\n".json_encode($answer)."\n```"]]],
        ]), ['http_code' => 200]);
    }
}
