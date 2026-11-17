<?php

namespace App\Tests\Support;

use Symfony\Component\HttpClient\Response\MockResponse;
use Symfony\Contracts\HttpClient\ResponseInterface;

/**
 * Toutes les requêtes HTTP sortantes des tests (framework.http_client.
 * mock_response_factory) : Open-Meteo (météo et géocodage), la styliste de
 * la suggestion de tenues, et OpenRouter pour le reste (OpenRouterMock).
 *
 * Réglages par test : $temperature, $weatherCode, $stylistChoice
 * (null : l'IA ne répond pas), $weatherDown.
 */
final class HttpMock
{
    public static int $temperature = 12;
    public static int $weatherCode = 3;
    public static bool $weatherDown = false;
    public static ?int $stylistChoice = 2;

    /** @var list<string> les URL appelées */
    public static array $calls = [];

    /** @var list<array<string, mixed>> les messages envoyés à Expo Push */
    public static array $pushes = [];

    public function __construct(private readonly OpenRouterMock $openRouter)
    {
    }

    /**
     * @return list<array<string, mixed>> les messages envoyés à Expo Push (relus à chaque appel)
     *
     * @phpstan-impure
     */
    public static function pushes(): array
    {
        return self::$pushes;
    }

    public static function reset(): void
    {
        self::$temperature = 12;
        self::$weatherCode = 3;
        self::$weatherDown = false;
        self::$stylistChoice = 2;
        self::$calls = [];
        self::$pushes = [];
    }

    /** @param array<string, mixed> $options */
    public function __invoke(string $method, string $url, array $options): ResponseInterface
    {
        self::$calls[] = $url;
        if (str_contains($url, 'exp.host')) {
            // Expo Push : un ticket par message ; un jeton contenant « gone » est désinscrit.
            $messages = json_decode($options['body'] ?? '[]', true);
            self::$pushes = [...self::$pushes, ...$messages];

            return new MockResponse(json_encode(['data' => array_map(
                static fn (array $m) => str_contains((string) $m['to'], 'gone') ? ['status' => 'error', 'details' => ['error' => 'DeviceNotRegistered']] : ['status' => 'ok', 'id' => 'ticket'],
                $messages,
            )]));
        }
        if (str_contains($url, 'geocoding-api.open-meteo.com')) {
            return new MockResponse(json_encode(['results' => [['name' => 'Troyes', 'latitude' => 48.3, 'longitude' => 4.08]]]));
        }
        if (str_contains($url, 'api.open-meteo.com')) {
            return self::$weatherDown
                ? new MockResponse('', ['http_code' => 503])
                : new MockResponse(json_encode([
                    'current' => ['temperature_2m' => self::$temperature, 'weather_code' => self::$weatherCode, 'wind_speed_10m' => 10],
                    'daily' => ['temperature_2m_min' => [self::$temperature - 3], 'temperature_2m_max' => [self::$temperature + 4], 'precipitation_probability_max' => [self::$weatherCode >= 51 ? 80 : 10]],
                ]));
        }

        $prompt = json_decode($options['body'] ?? '{}', true)['messages'][0]['content'][0]['text'] ?? '';
        if (str_contains($prompt, 'Tu es styliste')) {
            if (null === self::$stylistChoice) {
                return new MockResponse('', ['http_code' => 503]);
            }

            return new MockResponse(json_encode(['choices' => [['message' => ['content' => json_encode(['choice' => self::$stylistChoice, 'reason' => 'Le bleu du jean adoucit le noir.'])]]]]));
        }

        return ($this->openRouter)($method, $url, $options);
    }
}
