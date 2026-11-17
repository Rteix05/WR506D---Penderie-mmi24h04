<?php

namespace App\Service\Scan;

use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpException;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Pose une question à un modèle, via OpenRouter : sur une image pour le scan
 * (modèles de vision), ou en texte seul pour la pré-analyse des signalements
 * et des litiges (même chaîne de secours, autre liste de modèles : voir le
 * service app.moderation_llm dans services.yaml).
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
 *
 * Tout tient dans un BUDGET de temps commun à la chaîne : PHP coupe une
 * requête au bout de 30 s (max_execution_time) et renvoie alors une page
 * d'erreur HTML au lieu de JSON. Chaque modèle reçoit au plus ce qui reste
 * du budget ; quand il ne reste plus assez, on s'arrête sur
 * VisionUnavailable, que les appelants savent traiter (« pas reconnu »).
 *
 * Chaque tentative note son modèle, son erreur, son code HTTP et sa durée
 * (ms) ; la réponse comme l'échec portent la durée totale. C'est ce que lit
 * le journal des scans du back-office.
 */
final class OpenRouterVision
{
    /** En dessous, un modèle n'a pas le temps de répondre : inutile de l'appeler. */
    private const MIN_ATTEMPT = 3.0;

    /** @param list<string> $models */
    public function __construct(
        private readonly HttpClientInterface $openrouterClient,
        private readonly array $models,
        private readonly float $timeout = 20.0,
        private readonly float $budget = 24.0,
    ) {
    }

    /** @return list<string> */
    public function models(): array
    {
        return array_values(array_filter(array_map('trim', $this->models)));
    }

    /**
     * $budget remplace le budget de temps par défaut : une commande (pas de
     * limite de 30 s par requête) peut laisser plus de temps aux modèles lents.
     *
     * @throws VisionUnavailable quand aucun modèle n'a donné de réponse exploitable
     */
    public function ask(string $prompt, ?string $imageBytes = null, ?string $mimeType = null, ?float $budget = null): VisionAnswer
    {
        $started = microtime(true);
        $models = $this->models();
        if ([] === $models) {
            throw new VisionUnavailable('Aucun modèle configuré.', [], 0);
        }
        $content = [['type' => 'text', 'text' => $prompt]];
        if (null !== $imageBytes) {
            $content[] = ['type' => 'image_url', 'image_url' => ['url' => 'data:'.($mimeType ?? 'image/jpeg').';base64,'.base64_encode($imageBytes)]];
        }
        $attempts = [];
        $deadline = $started + ($budget ?? $this->budget);
        // Avec un budget plus large, chaque modèle a aussi plus de temps (la moitié du budget au plus).
        $perModel = null === $budget ? $this->timeout : max($this->timeout, $budget / 2);

        foreach ($models as $model) {
            $left = $deadline - microtime(true);
            if ($left < self::MIN_ATTEMPT) {
                $attempts[] = ['model' => $model, 'error' => 'non essayé : délai total dépassé', 'status' => null, 'ms' => 0];
                continue;
            }
            $t = microtime(true);
            try {
                $response = $this->openrouterClient->request('POST', 'chat/completions', [
                    'json' => [
                        'model' => $model,
                        'messages' => [['role' => 'user', 'content' => $content]],
                        'temperature' => 0.1,
                        'max_tokens' => 2000,
                    ],
                    'max_duration' => min($perModel, $left),
                ]);
                $status = $response->getStatusCode();
                $body = $response->toArray(false);
            } catch (HttpException $e) {
                $attempts[] = ['model' => $model, 'error' => 'transport: '.$e->getMessage(), 'status' => null, 'ms' => self::since($t)];
                continue;
            }

            if (401 === $status) {
                $attempts[] = ['model' => $model, 'error' => 'HTTP 401 : clé OpenRouter refusée', 'status' => 401, 'ms' => self::since($t)];
                throw new VisionUnavailable('Clé OpenRouter refusée (OPENROUTER_API_KEY).', $attempts, self::since($started));
            }
            $text = $body['choices'][0]['message']['content'] ?? null;
            if ($status >= 300 || isset($body['error']) || !\is_string($text)) {
                $attempts[] = ['model' => $model, 'error' => \sprintf('HTTP %d : %s', $status, $body['error']['message'] ?? 'réponse sans contenu'), 'status' => $status, 'ms' => self::since($t)];
                continue;
            }
            $data = self::extractJson($text);
            if (null === $data) {
                $attempts[] = ['model' => $model, 'error' => 'réponse illisible (pas de JSON)', 'status' => $status, 'ms' => self::since($t)];
                continue;
            }

            return new VisionAnswer($model, $data, $attempts, self::since($started), self::since($t));
        }

        throw new VisionUnavailable('Aucun modèle n\'a répondu.', $attempts, self::since($started));
    }

    /** Millisecondes écoulées depuis $t (microtime). */
    private static function since(float $t): int
    {
        return (int) round((microtime(true) - $t) * 1000);
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
