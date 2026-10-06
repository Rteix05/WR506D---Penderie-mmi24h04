<?php

namespace App\Service\Scan;

use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpException;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Pose une question sur une image à un modèle de vision, via OpenRouter.
 *
 * Les modèles sont essayés dans l'ordre de OPENROUTER_SCAN_MODELS : les
 * modèles gratuits sont limités (≈ 20 requêtes/minute, quota quotidien) et
 * disparaissent parfois du catalogue, un seul modèle rendrait donc le scan
 * fragile. On passe au suivant sur tout ce qui tient au modèle (quota 429,
 * modèle retiré 404, panne 5xx, délai dépassé, réponse vide ou pas en JSON),
 * et on s'arrête net sur une clé refusée (401) : tous échoueraient pareil.
 *
 * Gemma n'accepte pas de message « system » chez tous les hébergeurs :
 * la consigne part dans le message utilisateur, avec l'image.
 */
final class OpenRouterVision
{
    /** @param list<string> $models */
    public function __construct(
        private readonly HttpClientInterface $openrouterClient,
        private readonly array $models,
        private readonly float $timeout = 30.0,
    ) {
    }

    /** @return list<string> */
    public function models(): array
    {
        return array_values(array_filter(array_map('trim', $this->models)));
    }

    /**
     * @throws VisionUnavailable quand aucun modèle n'a donné de réponse exploitable
     */
    public function ask(string $prompt, string $imageBytes, string $mimeType): VisionAnswer
    {
        $models = $this->models();
        if ([] === $models) {
            throw new VisionUnavailable('Aucun modèle configuré (OPENROUTER_SCAN_MODELS).', []);
        }
        $image = 'data:'.$mimeType.';base64,'.base64_encode($imageBytes);
        $attempts = [];

        foreach ($models as $model) {
            try {
                $response = $this->openrouterClient->request('POST', 'chat/completions', [
                    'json' => [
                        'model' => $model,
                        'messages' => [['role' => 'user', 'content' => [
                            ['type' => 'text', 'text' => $prompt],
                            ['type' => 'image_url', 'image_url' => ['url' => $image]],
                        ]]],
                        'temperature' => 0.1,
                        'max_tokens' => 2000,
                    ],
                    'max_duration' => $this->timeout,
                ]);
                $status = $response->getStatusCode();
                $body = $response->toArray(false);
            } catch (HttpException $e) {
                $attempts[] = ['model' => $model, 'error' => 'transport: '.$e->getMessage()];
                continue;
            }

            if (401 === $status) {
                $attempts[] = ['model' => $model, 'error' => 'HTTP 401 : clé OpenRouter refusée'];
                throw new VisionUnavailable('Clé OpenRouter refusée (OPENROUTER_API_KEY).', $attempts);
            }
            $content = $body['choices'][0]['message']['content'] ?? null;
            if ($status >= 300 || isset($body['error']) || !\is_string($content)) {
                $attempts[] = ['model' => $model, 'error' => \sprintf('HTTP %d : %s', $status, $body['error']['message'] ?? 'réponse sans contenu')];
                continue;
            }
            $data = self::extractJson($content);
            if (null === $data) {
                $attempts[] = ['model' => $model, 'error' => 'réponse illisible (pas de JSON)'];
                continue;
            }

            return new VisionAnswer($model, $data, $attempts);
        }

        throw new VisionUnavailable('Aucun modèle de vision n\'a répondu.', $attempts);
    }

    /**
     * Le modèle entoure souvent son JSON de ```json … ``` ou d'une phrase :
     * on garde ce qui va de la première accolade à la dernière.
     *
     * @return array<string, mixed>|null
     */
    public static function extractJson(string $content): ?array
    {
        $start = strpos($content, '{');
        $end = strrpos($content, '}');
        if (false === $start || false === $end || $end < $start) {
            return null;
        }
        $data = json_decode(substr($content, $start, $end - $start + 1), true);

        return \is_array($data) ? $data : null;
    }
}
