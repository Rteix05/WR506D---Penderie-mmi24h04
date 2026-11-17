<?php

namespace App\Tests\Api;

use App\Entity\Dressing\GarmentExclusion;
use App\Entity\Dressing\Outfit;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Place\Room;
use App\Entity\Reference\GarmentCategory;
use App\Tests\Support\HttpMock;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Les suggestions de tenues (écran « Ta tenue ») : la météo (simulée), les
 * règles, le choix de l'IA (simulée), puis Remplacer, Je n'aime pas,
 * Nouvelle tenue et J'aime cette tenue.
 */
final class OutfitSuggestionApiTest extends ApiTestBase
{
    /** @var array<string, mixed> */
    private array $alice;

    protected function setUp(): void
    {
        parent::setUp();
        HttpMock::reset();
        $this->alice = $this->signUp('alice');
    }

    /** Un petit dressing : deux hauts, deux bas, des baskets, une veste et un manteau. */
    private function dress(): void
    {
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $me = $em->find(Profile::class, $this->alice['profileId']);
        $room = $em->find(Room::class, basename($this->roomOf($this->alice)));
        $category = static fn (string $slug) => $em->getRepository(GarmentCategory::class)->findOneBy(['slug' => $slug, 'owner' => null]);
        foreach (['T-shirt blanc' => 't-shirts', 'Chemise' => 'chemises', 'Jean' => 'jeans', 'Pantalon noir' => 'pantalons', 'Baskets' => 'baskets', 'Veste en jean' => 'vestes', 'Manteau' => 'manteaux'] as $name => $slug) {
            $em->persist(new Garment($me, $name, $room, $category($slug)));
        }
        $em->flush();
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>
     */
    private function suggest(array $body = ['occasion' => 'WORK', 'latitude' => 48.297, 'longitude' => 4.074, 'locale' => 'fr']): array
    {
        $response = $this->call('POST', '/api/outfit-suggestions', $this->alice, $body);
        self::assertResponseStatusCodeSame(201);

        return $response->toArray()['suggestion'];
    }

    public function testATenueForACoolWorkDay(): void
    {
        $this->dress();
        $s = $this->suggest();

        self::assertSame('WORK', $s['occasion']);
        self::assertSame(12, $s['forecast']['temperature']);
        self::assertSame('AI', $s['source'], 'l\'IA a choisi parmi les candidates');
        $names = array_column($s['pieces'], 'name');
        self::assertContains('Veste en jean', $names, 'une veste à 12 °C');
        self::assertNotContains('Manteau', $names, 'pas besoin de manteau');
        self::assertSame('outer', $s['pieces'][0]['slot'], 'la couche du dessus en premier');
        $codes = array_column($s['reasons'], 'code');
        self::assertSame('weather', $codes[0]);
        self::assertContains('occasion', $codes);
        self::assertContains('harmony', $codes);
        self::assertContains('Le bleu du jean adoucit le noir.', array_column($s['reasons'], 'text'));

        $current = $this->call('GET', '/api/outfit-suggestions/current', $this->alice)->toArray();
        self::assertSame($s['id'], $current['suggestion']['id']);
    }

    public function testWithoutAiTheRulesDecide(): void
    {
        $this->dress();
        HttpMock::$stylistChoice = null;

        self::assertSame('RULES', $this->suggest()['source']);
    }

    public function testWithoutPositionTheHomeCityGivesTheWeather(): void
    {
        $this->dress();
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $room = $em->find(Room::class, basename($this->roomOf($this->alice)));
        $room->getPlace()->setAddress('12 rue Émile Zola, 10000 Troyes');
        $em->flush();

        $s = $this->suggest(['occasion' => 'EVERYDAY']);
        self::assertSame('Troyes', $s['forecast']['place']);
    }

    public function testWeatherDownStillGivesATenue(): void
    {
        $this->dress();
        HttpMock::$weatherDown = true;

        $s = $this->suggest();
        self::assertNull($s['forecast']);
        self::assertSame('noWeather', $s['reasons'][0]['code']);
    }

    public function testReplaceDislikeNextAndAccept(): void
    {
        $this->dress();
        $s = $this->suggest();
        $bottom = array_values(array_filter($s['pieces'], static fn (array $p) => 'bottom' === $p['slot']))[0];

        // « Je n'aime pas » : remplacée, et écartée des prochaines suggestions.
        $after = $this->call('POST', '/api/outfit-suggestions/'.$s['id'].'/swap', $this->alice, ['garment' => $bottom['id'], 'dislike' => true])->toArray()['suggestion'];
        self::assertNotContains($bottom['id'], array_column($after['pieces'], 'id'));
        $em = static::getContainer()->get(EntityManagerInterface::class);
        self::assertSame(1, $em->getRepository(GarmentExclusion::class)->count(['garment' => $bottom['id']]));

        // « Nouvelle tenue » : l'ancienne est remplacée, l'exclusion tient.
        $next = $this->call('POST', '/api/outfit-suggestions/'.$s['id'].'/next', $this->alice, ['latitude' => 48.297, 'longitude' => 4.074])->toArray()['suggestion'];
        self::assertNotSame($s['id'], $next['id']);
        self::assertNotContains($bottom['id'], array_column($next['pieces'], 'id'));
        $this->call('POST', '/api/outfit-suggestions/'.$s['id'].'/swap', $this->alice, ['garment' => $after['pieces'][0]['id']]);
        self::assertResponseStatusCodeSame(422, 'l\'ancienne suggestion est close');

        // « J'aime cette tenue » : une tenue du dressing.
        $outfit = $this->call('POST', '/api/outfit-suggestions/'.$next['id'].'/accept', $this->alice, ['name' => 'Lundi'])->toArray()['outfit'];
        self::assertResponseStatusCodeSame(201);
        self::assertSame('Lundi', $outfit['name']);
        self::assertCount(\count($next['pieces']), $em->find(Outfit::class, $outfit['id'])?->getGarments() ?? []);
    }

    public function testAnEmptyWardrobeIsExplained(): void
    {
        $this->call('POST', '/api/outfit-suggestions', $this->alice, ['occasion' => 'EVERYDAY']);
        self::assertResponseStatusCodeSame(422);
    }

    public function testSomeoneElsesSuggestionIsInvisible(): void
    {
        $this->dress();
        $s = $this->suggest();
        $bob = $this->signUp('bob');

        $this->call('POST', '/api/outfit-suggestions/'.$s['id'].'/accept', $bob, []);
        self::assertResponseStatusCodeSame(404);
    }

    public function testRequiresAuthentication(): void
    {
        $this->client->request('POST', '/api/outfit-suggestions', ['json' => ['occasion' => 'WORK']]);
        self::assertResponseStatusCodeSame(401);
    }
}
