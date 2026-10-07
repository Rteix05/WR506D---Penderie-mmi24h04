<?php

namespace App\Tests\Unit;

use App\Service\Scan\OpenRouterVision;
use App\Service\Scan\VisionUnavailable;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

/**
 * La chaîne de fallback : quels échecs font passer au modèle suivant,
 * lequel arrête tout, et ce qu'on garde de chaque tentative.
 */
final class OpenRouterVisionTest extends TestCase
{
    private const MODELS = ['gemma-a:free', 'gemma-b:free', 'autre-c:free', 'autre-d:free'];

    private static function answer(string $content): MockResponse
    {
        return new MockResponse(json_encode(['choices' => [['message' => ['content' => $content]]]]));
    }

    /** @param list<MockResponse> $responses */
    private static function vision(array $responses, array &$models = []): OpenRouterVision
    {
        $client = new MockHttpClient(static function (string $method, string $url, array $options) use (&$responses, &$models) {
            $models[] = json_decode($options['body'], true)['model'];

            return array_shift($responses);
        }, 'https://openrouter.ai/api/v1/');

        return new OpenRouterVision($client, self::MODELS);
    }

    public function testFirstModelAnswers(): void
    {
        $answer = self::vision([self::answer('{"name": "Perceuse"}')])->ask('?', 'img', 'image/jpeg');

        self::assertSame('gemma-a:free', $answer->model);
        self::assertSame(['name' => 'Perceuse'], $answer->data);
        self::assertSame([], $answer->failedAttempts);
    }

    public function testFallsBackOnQuotaOutageTimeoutAndGarbage(): void
    {
        $models = [];
        $answer = self::vision([
            new MockResponse('{"error": {"message": "Rate limit exceeded"}}', ['http_code' => 429]),
            new MockResponse('', ['error' => 'Idle timeout reached']),
            self::answer('Désolé, je ne vois pas bien.'),
            self::answer("```json\n{\"name\": \"Jean\"}\n```"),
        ], $models)->ask('?', 'img', 'image/png');

        self::assertSame(self::MODELS, $models, 'les quatre modèles sont essayés dans l\'ordre');
        self::assertSame('autre-d:free', $answer->model);
        self::assertSame(['name' => 'Jean'], $answer->data);
        self::assertCount(3, $answer->failedAttempts);
        self::assertStringContainsString('429', $answer->failedAttempts[0]['error']);
        self::assertStringContainsString('transport', $answer->failedAttempts[1]['error']);
        self::assertStringContainsString('JSON', $answer->failedAttempts[2]['error']);
    }

    public function testErrorInsideA200IsAFailure(): void
    {
        $answer = self::vision([
            new MockResponse('{"error": {"message": "Provider returned error"}}'),
            self::answer('{"name": "Lampe"}'),
        ])->ask('?', 'img', 'image/jpeg');

        self::assertSame('gemma-b:free', $answer->model);
    }

    public function testRejectedKeyStopsTheChain(): void
    {
        $models = [];
        try {
            self::vision([new MockResponse('{"error": {"message": "No auth credentials found"}}', ['http_code' => 401])], $models)->ask('?', 'img', 'image/jpeg');
            self::fail('une clé refusée doit lever VisionUnavailable');
        } catch (VisionUnavailable $e) {
            self::assertSame(['gemma-a:free'], $models, 'inutile d\'essayer les autres modèles avec la même clé');
            self::assertCount(1, $e->attempts);
        }
    }

    public function testAllModelsDown(): void
    {
        $this->expectException(VisionUnavailable::class);
        self::vision(array_fill(0, 4, new MockResponse('', ['http_code' => 503])))->ask('?', 'img', 'image/jpeg');
    }

    public function testSendsTheImageAsDataUrl(): void
    {
        $sent = null;
        $client = new MockHttpClient(static function (string $method, string $url, array $options) use (&$sent) {
            $sent = ['url' => $url, 'body' => json_decode($options['body'], true)];

            return self::answer('{}');
        }, 'https://openrouter.ai/api/v1/');
        (new OpenRouterVision($client, [' gemma-a:free ', '']))->ask('Décris', 'abc', 'image/webp');

        self::assertSame('https://openrouter.ai/api/v1/chat/completions', $sent['url']);
        self::assertSame('gemma-a:free', $sent['body']['model'], 'la liste venue du .env est nettoyée');
        $content = $sent['body']['messages'][0]['content'];
        self::assertSame('Décris', $content[0]['text']);
        self::assertSame('data:image/webp;base64,'.base64_encode('abc'), $content[1]['image_url']['url']);
    }

    public function testExtractsJsonFromChattyAnswers(): void
    {
        self::assertSame(['a' => 1], OpenRouterVision::extractJson('Voici : {"a": 1} voilà'));
        self::assertNull(OpenRouterVision::extractJson('rien'));
        self::assertNull(OpenRouterVision::extractJson('{pas du json}'));
    }
}
