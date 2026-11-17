<?php

namespace App\Service\Outfit;

use App\Enum\Dressing\Weather;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpException;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * La météo du jour, par Open-Meteo : gratuit, sans clé ni compte, données
 * des services météo nationaux (Météo-France pour la France).
 *
 * Deux façons de situer l'utilisateur :
 *  - la position du téléphone, s'il l'a acceptée (arrondie à 0,01°, soit
 *    environ 1 km : la météo n'a pas besoin de plus) ;
 *  - sinon, la ville de son logement, retrouvée par le géocodage
 *    d'Open-Meteo à partir de l'adresse.
 *
 * Mise en cache 30 minutes par lieu (la météo ne change pas plus vite, et
 * on reste poli avec un service gratuit). Toute panne renvoie null : la
 * suggestion se fait alors sans météo, jamais en erreur.
 */
final class WeatherProvider
{
    private const FORECAST = 'https://api.open-meteo.com/v1/forecast';
    private const GEOCODING = 'https://geocoding-api.open-meteo.com/v1/search';

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly CacheInterface $cache,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function at(float $latitude, float $longitude, ?string $place = null): ?Forecast
    {
        if (abs($latitude) > 90 || abs($longitude) > 180) {
            return null;
        }
        $lat = round($latitude, 2);
        $lon = round($longitude, 2);

        try {
            $data = $this->cache->get(\sprintf('weather_%s_%s', str_replace(['.', '-'], ['_', 'm'], (string) $lat), str_replace(['.', '-'], ['_', 'm'], (string) $lon)), function (ItemInterface $item) use ($lat, $lon): array {
                $item->expiresAfter(1800);

                return $this->httpClient->request('GET', self::FORECAST, [
                    'query' => [
                        'latitude' => $lat,
                        'longitude' => $lon,
                        'current' => 'temperature_2m,weather_code,wind_speed_10m',
                        'daily' => 'temperature_2m_min,temperature_2m_max,precipitation_probability_max',
                        'timezone' => 'auto',
                        'forecast_days' => 1,
                    ],
                    'timeout' => 4,
                    'max_duration' => 5,
                ])->toArray();
            });
        } catch (HttpException|\JsonException $e) {
            $this->logger->warning('Open-Meteo indisponible : {message}', ['message' => $e->getMessage()]);

            return null;
        }

        $now = $data['current'] ?? [];
        $daily = $data['daily'] ?? [];
        if (!is_numeric($now['temperature_2m'] ?? null)) {
            return null;
        }
        $temperature = (int) round((float) $now['temperature_2m']);

        return new Forecast(
            $temperature,
            (int) round((float) ($daily['temperature_2m_min'][0] ?? $temperature)),
            (int) round((float) ($daily['temperature_2m_max'][0] ?? $temperature)),
            self::weather((int) ($now['weather_code'] ?? 0), (float) ($now['wind_speed_10m'] ?? 0)),
            (int) ($daily['precipitation_probability_max'][0] ?? 0),
            $place,
        );
    }

    /** La ville d'une adresse en texte libre (« 12 rue X, 10000 Troyes » → Troyes), puis sa météo. */
    public function forAddress(string $address): ?Forecast
    {
        $city = self::cityOf($address);
        if (null === $city) {
            return null;
        }
        try {
            $found = $this->cache->get('geocode_'.md5(mb_strtolower($city)), function (ItemInterface $item) use ($city): array {
                $item->expiresAfter(86400 * 30);

                return $this->httpClient->request('GET', self::GEOCODING, [
                    'query' => ['name' => $city, 'count' => 1, 'language' => 'fr', 'format' => 'json'],
                    'timeout' => 4,
                    'max_duration' => 5,
                ])->toArray()['results'][0] ?? [];
            });
        } catch (HttpException|\JsonException $e) {
            $this->logger->warning('Géocodage Open-Meteo indisponible : {message}', ['message' => $e->getMessage()]);

            return null;
        }
        if (!is_numeric($found['latitude'] ?? null) || !is_numeric($found['longitude'] ?? null)) {
            return null;
        }

        return $this->at((float) $found['latitude'], (float) $found['longitude'], \is_string($found['name'] ?? null) ? $found['name'] : $city);
    }

    /** Le dernier morceau de l'adresse, sans le code postal : en France, la ville. */
    public static function cityOf(string $address): ?string
    {
        $parts = array_values(array_filter(array_map('trim', preg_split('/[,\n]/', $address) ?: [])));
        if ([] === $parts) {
            return null;
        }
        $city = trim((string) preg_replace('/\b\d{4,5}\b/', '', end($parts)));
        $city = trim((string) preg_replace('/\b(france|cedex)\b/iu', '', $city));

        return mb_strlen($city) >= 2 ? $city : null;
    }

    /** Codes WMO d'Open-Meteo → le temps du modèle de données. */
    public static function weather(int $code, float $windKmh = 0): Weather
    {
        $weather = match (true) {
            $code <= 1 => Weather::Sunny,
            $code <= 48 => Weather::Cloudy,
            $code >= 71 && $code <= 77, 85 === $code, 86 === $code => Weather::Snow,
            default => Weather::Rain,
        };

        // Beaucoup de vent sans pluie ni neige : c'est le vent qui compte pour s'habiller.
        return $windKmh >= 40 && \in_array($weather, [Weather::Sunny, Weather::Cloudy], true) ? Weather::Wind : $weather;
    }
}
