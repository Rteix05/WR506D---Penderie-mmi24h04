<?php

namespace App\Service\Outfit;

use App\Enum\Dressing\Weather;

/**
 * La météo du jour, telle que le moteur la lit : température actuelle,
 * minimale et maximale (°C), le temps qu'il fait, et le lieu.
 */
final class Forecast
{
    public function __construct(
        public readonly int $temperature,
        public readonly int $min,
        public readonly int $max,
        public readonly Weather $weather,
        public readonly int $rainChance,
        public readonly ?string $place = null,
    ) {
    }

    /** La température qui compte pour s'habiller : celle de maintenant, tirée vers la plus fraîche de la journée. */
    public function feltTemperature(): int
    {
        return (int) round(min($this->temperature, ($this->temperature + $this->min) / 2 + 1));
    }

    /** Pluie ou neige annoncée : il faut un vêtement de pluie. */
    public function isWet(): bool
    {
        return \in_array($this->weather, [Weather::Rain, Weather::Snow], true) || $this->rainChance >= 60;
    }

    /** @return array{temperature: int, min: int, max: int, weather: string, rainChance: int, place: ?string} */
    public function toArray(): array
    {
        return ['temperature' => $this->temperature, 'min' => $this->min, 'max' => $this->max, 'weather' => $this->weather->value, 'rainChance' => $this->rainChance, 'place' => $this->place];
    }
}
