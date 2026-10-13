<?php

namespace App\Tests\Support;

use Symfony\Component\HttpClient\Response\MockResponse;
use Symfony\Contracts\HttpClient\ResponseInterface;

/**
 * Un faux OpenRouter pour les tests fonctionnels : le premier modèle de la
 * chaîne est toujours « à court de quota » (429), ce qui fait passer chaque
 * scan par le fallback ; le suivant répond selon la consigne (photo,
 * étiquette, ou point d'un look du jour). Avec $down, tous les modèles
 * sont en panne.
 */
final class OpenRouterMock
{
    public static bool $down = false;

    /** Le contour rendu pour un point de look (sur le gros plan), et la dernière consigne reçue. */
    public static ?array $box = [0.25, 0.25, 0.75, 0.75];
    public static string $lastPrompt = '';

    /** @param array<string, mixed> $options */
    public function __invoke(string $method, string $url, array $options): ResponseInterface
    {
        $request = json_decode($options['body'] ?? '{}', true);
        $model = $request['model'] ?? '';
        if (self::$down || str_starts_with($model, 'google/gemma-4-31b')) {
            return new MockResponse(json_encode(['error' => ['code' => 429, 'message' => 'Rate limit exceeded: free-models-per-min']]), ['http_code' => 429]);
        }
        $prompt = $request['messages'][0]['content'][0]['text'] ?? '';
        self::$lastPrompt = $prompt;
        $answer = match (true) {
            // Un point de look du jour : le 1er vêtement du dressing s'il y en a un, sinon un vêtement nouveau.
            str_contains($prompt, 'gros plan découpé') => ['box' => self::$box] + (str_contains($prompt, '(le dressing est vide)')
                ? ['match' => null, 'name' => 'Veste en jean', 'description' => 'Une veste en jean délavée.', 'category' => 'jeans',
                    'brand' => null, 'colors' => ['Bleu marine'], 'confidence' => 0.7]
                : ['match' => 1, 'name' => null, 'colors' => [], 'confidence' => 0.8]),
            default => $this->scanAnswer($prompt),
        };

        return new MockResponse(json_encode([
            'model' => $model,
            'choices' => [['message' => ['role' => 'assistant', 'content' => "```json\n".json_encode($answer)."\n```"]]],
        ]), ['http_code' => 200]);
    }

    /** @return array<string, mixed> */
    private function scanAnswer(string $prompt): array
    {
        return str_contains($prompt, 'étiquette cousue')
            ? ['type' => 'GARMENT', 'name' => null, 'brand' => 'Levi\'s', 'size' => 'W32 L34', 'colors' => [],
                'composition' => [['material' => 'coton', 'percent' => 99], ['material' => 'élasthanne', 'percent' => 1]],
                'care' => ['lavage à 30 °C'], 'madeIn' => 'Turquie', 'confidence' => 0.9]
            : ['type' => 'GARMENT', 'name' => 'Jean slim bleu', 'description' => 'Un jean bleu brut.', 'category' => 'jeans',
                'brand' => null, 'colors' => ['Bleu marine', 'Couleur inventée'], 'size' => null, 'composition' => [], 'care' => [], 'confidence' => 0.8];
    }
}
