<?php

namespace App\Service\Outfit;

/**
 * Le moteur de suggestion, partie règles : à partir des vêtements
 * disponibles, de l'occasion et de la météo, il compose des tenues
 * cohérentes et les classe. Code pur (aucune requête) : testable et
 * explicable ligne à ligne.
 *
 * 1. Chaque vêtement trouve sa place (haut, bas, robe ou costume, couche
 *    du dessus, chaussures, accessoire chaud) d'après sa catégorie.
 * 2. Règles fermes : pas de vêtement de sport pour le travail ou une
 *    soirée, pas de costume pour le sport, pas de jogging au travail.
 * 3. Chaque pièce reçoit une note : chaleur face à la température,
 *    imperméable s'il pleut, usage adapté à l'occasion, couleurs et styles
 *    aimés ou non, porté récemment ou déjà proposé (on varie).
 * 4. On assemble : haut + bas, ou robe ; chaussures ; couche du dessus s'il
 *    fait frais ou humide ; accessoire chaud s'il fait froid. La tenue
 *    gagne des points si ses couleurs s'accordent (neutres, ou un seul
 *    accent) et si haut et bas partagent un style.
 * 5. On garde les meilleures tenues assez différentes entre elles : ce
 *    sont les candidates entre lesquelles l'IA choisira (OutfitChooser).
 */
final class OutfitEngine
{
    public const OCCASIONS = ['EVERYDAY', 'WORK', 'SPORT', 'EVENING'];

    /** Familles de couleur qui s'accordent avec tout. Le bleu l'est pour un bas (le jean). */
    private const NEUTRAL = ['BLACK', 'WHITE', 'GREY', 'BEIGE', 'BROWN'];

    /** Combien de pièces par place entrent dans les combinaisons (au-delà, la combinatoire explose pour rien). */
    private const PER_SLOT = 5;

    private const NOT_WORN = ['chaussons', 'pyjamas', 'enfant-pyjamas', 'maillots-bain', 'sous-vetements', 'chaussettes'];

    /**
     * @param list<Piece>                        $pieces      les vêtements disponibles
     * @param array<string, 'LIKE'|'DISLIKE'>    $colorPrefs  par identifiant de couleur
     * @param array<string, 'LIKE'|'DISLIKE'>    $stylePrefs  par identifiant de style
     * @param list<string>                       $avoid       identifiants à ne pas reproposer (nouvelle tenue)
     *
     * @return list<OutfitCandidate> les meilleures tenues, de la mieux notée à la moins bien
     */
    public function candidates(array $pieces, string $occasion, ?Forecast $forecast, array $colorPrefs = [], array $stylePrefs = [], array $avoid = [], int $count = 4, int $seed = 0): array
    {
        $bySlot = [];
        foreach ($pieces as $piece) {
            if (!$this->allowed($piece, $occasion) || !self::fitsWeather($piece, $forecast) || \in_array($piece->id, $avoid, true)) {
                continue;
            }
            $bySlot[$piece->slot][] = [$piece, $this->score($piece, $occasion, $forecast, $colorPrefs, $stylePrefs, $seed)];
        }
        foreach ($bySlot as $slot => $scored) {
            usort($scored, static fn (array $a, array $b) => $b[1] <=> $a[1]);
            $bySlot[$slot] = \array_slice($scored, 0, self::PER_SLOT);
        }

        $bases = [];
        foreach ($bySlot['top'] ?? [] as $top) {
            foreach ($bySlot['bottom'] ?? [] as $bottom) {
                $bases[] = [[$top, $bottom]];
            }
        }
        foreach ($bySlot['dress'] ?? [] as $dress) {
            $bases[] = [[$dress]];
        }
        if ([] === $bases) {
            return [];
        }

        $feel = $forecast?->feltTemperature();
        $needsOuter = null !== $forecast && ($feel < 17 || $forecast->isWet() || 'WIND' === $forecast->weather->value);
        $outers = $bySlot['outer'] ?? [];
        if ('SPORT' === $occasion && null !== $forecast && $forecast->feltTemperature() >= 10) {
            // Au sport on se réchauffe vite : au-dessus de 10 °C, seulement un imperméable s'il pleut.
            $needsOuter = $forecast->isWet();
            $outers = array_values(array_filter($outers, static fn (array $p) => $p[0]->waterResistant));
        }
        $needsAccessory = null !== $feel && $feel < 6;
        $extras = [
            'shoes' => \array_slice($bySlot['shoes'] ?? [], 0, 3),
            'outer' => $needsOuter ? \array_slice($outers, 0, 3) : [],
            'warmAccessory' => $needsAccessory ? \array_slice($bySlot['warmAccessory'] ?? [], 0, 1) : [],
        ];

        $combos = [];
        foreach ($bases as [$base]) {
            foreach ($this->product($extras) as $extra) {
                $chosen = [...$base, ...$extra];
                $combos[] = new OutfitCandidate(
                    array_map(static fn (array $p) => $p[0], $chosen),
                    array_sum(array_map(static fn (array $p) => $p[1], $chosen)) + $this->harmony(array_map(static fn (array $p) => $p[0], $chosen))[0] + $this->styleBonus(array_map(static fn (array $p) => $p[0], $chosen)),
                    $this->harmony(array_map(static fn (array $p) => $p[0], $chosen))[1],
                );
            }
        }
        usort($combos, static fn (OutfitCandidate $a, OutfitCandidate $b) => $b->score <=> $a->score);

        // Des tenues vraiment différentes : chacune change au moins une pièce principale (haut, bas, robe).
        $kept = [];
        foreach ($combos as $combo) {
            $main = $combo->mainIds();
            foreach ($kept as $k) {
                if ($k->mainIds() === $main) {
                    continue 2;
                }
            }
            $kept[] = $combo;
            if (\count($kept) === $count) {
                break;
            }
        }

        return $kept;
    }

    /**
     * La meilleure pièce de la même place pour remplacer $old (bouton
     * « Remplacer »), parmi celles qui ne sont pas déjà dans la tenue.
     *
     * @param list<Piece>                     $pieces
     * @param list<string>                    $exclude
     * @param array<string, 'LIKE'|'DISLIKE'> $colorPrefs
     * @param array<string, 'LIKE'|'DISLIKE'> $stylePrefs
     */
    public function replacement(array $pieces, Piece $old, string $occasion, ?Forecast $forecast, array $exclude, array $colorPrefs = [], array $stylePrefs = [], int $seed = 0): ?Piece
    {
        $best = null;
        $bestScore = -\INF;
        foreach ($pieces as $piece) {
            if ($piece->slot !== $old->slot || $piece->id === $old->id || \in_array($piece->id, $exclude, true) || !$this->allowed($piece, $occasion) || !self::fitsWeather($piece, $forecast)) {
                continue;
            }
            $score = $this->score($piece, $occasion, $forecast, $colorPrefs, $stylePrefs, $seed);
            if ($score > $bestScore) {
                [$best, $bestScore] = [$piece, $score];
            }
        }

        return $best;
    }

    /** La place d'un vêtement dans une tenue, d'après sa catégorie (et celle de son parent), ou null s'il ne se propose pas. */
    public static function slot(string $slug, ?string $parentSlug): ?string
    {
        $parent = $parentSlug ?? $slug;

        return match (true) {
            \in_array($slug, self::NOT_WORN, true) => null,
            \in_array($slug, ['hauts-sport', 'enfant-hauts', 'enfant-bodies'], true) => 'top',
            \in_array($slug, ['bas-sport', 'enfant-bas'], true) => 'bottom',
            'enfant-robes' === $slug => 'dress',
            'enfant-manteaux' === $slug => 'outer',
            'enfant-chaussures' === $slug => 'shoes',
            \in_array($slug, ['echarpes', 'gants', 'bonnets-chapeaux'], true) => 'warmAccessory',
            'hauts' === $parent => 'top',
            'bas' === $parent => 'bottom',
            'robes-combinaisons' === $parent, 'costumes' === $parent => 'dress',
            'vestes-manteaux' === $parent => 'outer',
            'chaussures' === $parent => 'shoes',
            default => null,
        };
    }

    /** Règle ferme de météo : ni short, ni sandales, ni maillot sous 18 °C ressentis. */
    public static function fitsWeather(Piece $piece, ?Forecast $forecast): bool
    {
        return null === $forecast || $forecast->feltTemperature() >= 18 || !\in_array($piece->categorySlug, ['shorts', 'sandales', 'maillots-bain'], true);
    }

    /** Règles fermes : ce qu'on ne propose jamais pour cette occasion. */
    public function allowed(Piece $piece, string $occasion): bool
    {
        $sporty = 'SPORT' === $piece->usage || \in_array($piece->categorySlug, ['hauts-sport', 'bas-sport', 'chaussures-sport', 'joggings'], true);

        // Un vêtement déclaré « soirée » (robe de soirée, costume de cérémonie) ne sort que le soir.
        return match ($occasion) {
            'WORK' => !$sporty && 'EVENING' !== $piece->usage && 'sandales' !== $piece->categorySlug,
            'EVENING' => !$sporty,
            'SPORT' => !\in_array($piece->categorySlug, ['costumes-complets', 'tailleurs', 'blazers', 'chaussures-ville', 'chemises', 'robes', 'jupes', 'jeans'], true) && 'EVENING' !== $piece->usage,
            default => 'EVENING' !== $piece->usage,
        };
    }

    /**
     * La note d'une pièce, seule.
     *
     * @param array<string, 'LIKE'|'DISLIKE'> $colorPrefs
     * @param array<string, 'LIKE'|'DISLIKE'> $stylePrefs
     */
    public function score(Piece $piece, string $occasion, ?Forecast $forecast, array $colorPrefs = [], array $stylePrefs = [], int $seed = 0): float
    {
        $score = 0.0;

        if (null !== $forecast) {
            $target = self::targetWarmth($piece->slot, $forecast->feltTemperature());
            if (null !== $target) {
                $score -= abs($piece->warmth - $target) * 2;
            }
            if ($forecast->isWet() && 'outer' === $piece->slot) {
                $score += $piece->waterResistant ? 3 : -1;
            }
            if ('shoes' === $piece->slot) {
                $cold = $forecast->feltTemperature() < 10;
                $score += match ($piece->categorySlug) {
                    'sandales' => ($forecast->isWet() || $forecast->feltTemperature() < 18) ? -6 : 1,
                    'bottes' => ($cold || 'SNOW' === $forecast->weather->value) ? 2 : ($forecast->feltTemperature() >= 20 ? -3 : 0),
                    default => 0,
                };
            }
        }

        // L'occasion : un vêtement pensé pour elle, et quelques catégories qui vont de soi.
        if ($piece->usage === $occasion) {
            $score += 3;
        }
        $score += match ($occasion) {
            'WORK' => \in_array($piece->categorySlug, ['chemises', 'blazers', 'chaussures-ville', 'pantalons', 'costumes-complets', 'tailleurs'], true) ? 1.5 : (\in_array($piece->categorySlug, ['shorts', 'tops'], true) ? -3 : 0),
            'EVENING' => \in_array($piece->categorySlug, ['robes', 'chemises', 'blazers', 'chaussures-ville', 'combinaisons'], true) ? 1.5 : 0,
            'SPORT' => \in_array($piece->categorySlug, ['hauts-sport', 'bas-sport', 'chaussures-sport', 'joggings', 'baskets'], true) ? 3 : -2,
            default => 0,
        };

        // Les goûts : une couleur ou un style aimé rapporte, détesté coûte plus cher.
        foreach ($piece->colorIds as $id) {
            $score += match ($colorPrefs[$id] ?? null) { 'LIKE' => 1.5, 'DISLIKE' => -4, default => 0 };
        }
        foreach ($piece->styleIds as $id) {
            $score += match ($stylePrefs[$id] ?? null) { 'LIKE' => 1.5, 'DISLIKE' => -4, default => 0 };
        }

        // Varier : porté hier, on évite ; pas porté depuis une semaine, on le ressort.
        $score += match (true) {
            null === $piece->daysSinceWorn => 0.5,
            $piece->daysSinceWorn <= 1 => -6,
            $piece->daysSinceWorn <= 3 => -3,
            $piece->daysSinceWorn <= 6 => -1.5,
            default => 0.5,
        };
        if ($piece->recentlySuggested) {
            $score -= 1;
        }

        // Un peu de hasard, stable dans la journée : deux pièces égales ne sortent pas toujours dans le même ordre.
        return $score + (crc32($piece->id.'|'.$seed) % 1000) / 1000;
    }

    /** La chaleur visée (1 très légère … 5 très chaude) pour une place, à cette température ; null : peu importe. */
    public static function targetWarmth(string $slot, int $feel): ?float
    {
        return match ($slot) {
            'top' => match (true) { $feel >= 25 => 1.5, $feel >= 18 => 2.0, $feel >= 12 => 2.5, $feel >= 5 => 3.5, default => 4.0 },
            'bottom' => $feel >= 22 ? 1.5 : 3.0,
            'dress' => $feel >= 18 ? 2.0 : 3.0,
            'outer' => match (true) { $feel >= 12 => 3.0, $feel >= 5 => 4.0, default => 5.0 },
            default => null,
        };
    }

    /**
     * L'accord des couleurs : uniquement des neutres, ou un seul accent,
     * c'est sûr ; deux accents, ça se discute ; trois, c'est trop.
     *
     * @param list<Piece> $pieces
     *
     * @return array{0: float, 1: string}
     */
    public function harmony(array $pieces): array
    {
        $accents = [];
        foreach ($pieces as $piece) {
            foreach ($piece->colorFamilies as $family) {
                $neutral = \in_array($family, self::NEUTRAL, true) || ('BLUE' === $family && 'bottom' === $piece->slot);
                if (!$neutral) {
                    $accents[$family] = true;
                }
            }
        }

        return match (\count($accents)) {
            0 => [2.0, 'neutral'],
            1 => [2.0, 'oneAccent'],
            2 => [-1.0, 'contrast'],
            default => [-4.0, 'busy'],
        };
    }

    /** @param list<Piece> $pieces Haut et bas qui partagent un style : un point. */
    private function styleBonus(array $pieces): float
    {
        $top = array_values(array_filter($pieces, static fn (Piece $p) => 'top' === $p->slot))[0] ?? null;
        $bottom = array_values(array_filter($pieces, static fn (Piece $p) => 'bottom' === $p->slot))[0] ?? null;

        return null !== $top && null !== $bottom && [] !== array_intersect($top->styleIds, $bottom->styleIds) ? 1.0 : 0.0;
    }

    /**
     * Toutes les façons de prendre une pièce (ou aucune, si la place est vide) dans chaque place.
     *
     * @param array<string, list<array{0: Piece, 1: float}>> $slots
     *
     * @return list<list<array{0: Piece, 1: float}>>
     */
    private function product(array $slots): array
    {
        $result = [[]];
        foreach ($slots as $options) {
            if ([] === $options) {
                continue;
            }
            $next = [];
            foreach ($result as $partial) {
                foreach ($options as $option) {
                    $next[] = [...$partial, $option];
                }
            }
            $result = $next;
        }

        return $result;
    }
}
