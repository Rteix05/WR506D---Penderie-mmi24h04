<?php

namespace App\Service\Outfit;

use App\Entity\Dressing\ColorPreference;
use App\Entity\Dressing\GarmentExclusion;
use App\Entity\Dressing\Outfit;
use App\Entity\Dressing\OutfitSuggestion;
use App\Entity\Dressing\OutfitSuggestionGarment;
use App\Entity\Dressing\StylePreference;
use App\Entity\Dressing\WearLog;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Place\Place;
use App\Enum\Dressing\SuggestionStatus;
use App\Enum\Dressing\Weather;
use App\Enum\Inventory\Availability;
use App\Enum\Inventory\GarmentUsage;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;

/**
 * Le moteur de suggestion de tenues, assemblé (écran « Ta tenue ») :
 *
 *  1. la météo du jour (WeatherProvider : position du téléphone, sinon
 *     ville du logement) ;
 *  2. le dressing disponible, lu une fois (WardrobeLoader ci-dessous) :
 *     ni prêté, ni vendu, ni supprimé, ni écarté par « Je n'aime pas » ;
 *     avec la dernière fois que chaque pièce a été portée (WearLog) ;
 *  3. les règles composent et classent des tenues (OutfitEngine) ;
 *  4. l'IA choisit parmi les meilleures (OutfitChooser), sinon la première ;
 *  5. la suggestion est enregistrée avec son explication (OutfitSuggestion).
 */
final class OutfitSuggester
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly OutfitEngine $engine,
        private readonly OutfitChooser $chooser,
        private readonly WeatherProvider $weather,
        private readonly ClockInterface $clock,
    ) {
    }

    /**
     * Une nouvelle suggestion. Avec $previous (« Nouvelle tenue »), on évite
     * ses pièces principales et on la clôt (REPLACED).
     *
     * @throws \DomainException quand le dressing ne permet aucune tenue
     */
    public function suggest(Profile $me, GarmentUsage $occasion, ?float $latitude, ?float $longitude, string $locale, ?OutfitSuggestion $previous = null): OutfitSuggestion
    {
        $forecast = null !== $latitude && null !== $longitude ? $this->weather->at($latitude, $longitude) : $this->homeForecast($me);
        [$pieces, $garments] = $this->wardrobe($me);
        [$colorPrefs, $stylePrefs] = $this->preferences($me, $occasion);
        $seed = (int) $this->clock->now()->format('Ymd');

        // « Nouvelle tenue » change les pièces principales (haut, bas, robe) ; chaussures et veste peuvent rester.
        $main = array_filter($pieces, static fn (Piece $p) => \in_array($p->slot, ['top', 'bottom', 'dress'], true));
        $previousIds = null === $previous ? [] : array_map(static fn (Garment $g) => (string) $g->getId(), $previous->getKeptGarments());
        $avoid = array_values(array_intersect($previousIds, array_map(static fn (Piece $p) => $p->id, $main)));
        // Tout changer si le dressing le permet ; sinon au moins une pièce principale ; sinon, faute de mieux, la même base.
        foreach ([$avoid, ...array_map(static fn (string $id) => [$id], $avoid), []] as $i => $tryAvoid) {
            $candidates = $this->engine->candidates($pieces, $occasion->value, $forecast, $colorPrefs, $stylePrefs, $tryAvoid, 4, $seed + $i);
            if ([] !== $candidates) {
                break;
            }
        }
        if ([] === $candidates) {
            throw new \DomainException('Ajoute au moins un haut et un bas, ou une robe, à ton dressing pour recevoir une tenue.');
        }

        $choice = $this->chooser->choose($candidates, $occasion->value, $forecast, $locale);
        $chosen = $candidates[$choice['index']];

        $suggestion = new OutfitSuggestion($me, $occasion, array_map(static fn (Piece $p) => $garments[$p->id], $chosen->pieces), $forecast?->temperature, $forecast?->weather);
        $suggestion->explain([
            'forecast' => $forecast?->toArray(),
            'source' => null === $choice['model'] ? 'RULES' : 'AI',
            'model' => $choice['model'],
            'aiMs' => $choice['ms'],
            'candidates' => \count($candidates),
            'score' => round($chosen->score, 1),
            'reasons' => $this->reasons($chosen, $occasion->value, $forecast, $stylePrefs, $choice['reason']),
        ]);
        $previous?->replace();
        $this->em->persist($suggestion);
        $this->em->flush();

        return $suggestion;
    }

    /**
     * « Remplacer » une pièce par la meilleure autre de la même place ; avec
     * $dislike (« Je n'aime pas »), elle est aussi écartée des prochaines
     * suggestions (GarmentExclusion), jusqu'à réactivation.
     *
     * @throws \DomainException quand aucune autre pièce ne convient
     */
    public function swap(OutfitSuggestion $suggestion, Garment $old, bool $dislike): void
    {
        $me = $suggestion->getProfile();
        [$pieces, $garments] = $this->wardrobe($me, keep: [$old]);
        [$colorPrefs, $stylePrefs] = $this->preferences($me, $suggestion->getOccasion());
        $oldPiece = array_values(array_filter($pieces, static fn (Piece $p) => $p->id === (string) $old->getId()))[0] ?? null;
        if (null === $oldPiece || !\in_array($old, $suggestion->getKeptGarments(), true)) {
            throw new \DomainException('Cette pièce ne fait pas partie de la tenue.');
        }
        if ($dislike) {
            $this->em->persist(new GarmentExclusion($me, $old, 'Je n\'aime pas (suggestion de tenue)', $suggestion));
        }

        $forecast = self::forecastFrom($suggestion->getExplanation()['forecast'] ?? null);
        $current = array_map(static fn (Garment $g) => (string) $g->getId(), $suggestion->getKeptGarments());
        $new = $this->engine->replacement($pieces, $oldPiece, $suggestion->getOccasion()->value, $forecast, $current, $colorPrefs, $stylePrefs, (int) $this->clock->now()->format('Ymd'));
        if (null === $new) {
            $this->em->flush();

            throw new \DomainException($dislike ? 'Pièce écartée de tes prochaines suggestions, mais aucune autre ne la remplace aujourd\'hui.' : 'Aucune autre pièce de ce type ne convient aujourd\'hui.');
        }
        $suggestion->swapGarment($old, $garments[$new->id]);

        // Les raisons suivent la tenue ; la phrase de l'IA, qui parlait de l'ancienne pièce, disparaît.
        $explanation = $suggestion->getExplanation();
        $kept = array_values(array_filter($pieces, static fn (Piece $p) => \in_array($p->id, array_map(static fn (Garment $g) => (string) $g->getId(), $suggestion->getKeptGarments()), true)));
        $candidate = new OutfitCandidate($kept, 0, $this->engine->harmony($kept)[1]);
        $explanation['reasons'] = $this->reasons($candidate, $suggestion->getOccasion()->value, $forecast, $stylePrefs, null);
        $explanation['source'] = 'RULES';
        $suggestion->explain($explanation);
        $this->em->flush();
    }

    /** « J'aime cette tenue » : elle devient une tenue du dressing (Outfit), liée à la suggestion. */
    public function accept(OutfitSuggestion $suggestion, ?string $name): Outfit
    {
        $name = trim((string) $name);
        $outfit = $suggestion->accept('' === $name ? 'Tenue du '.$this->clock->now()->format('d/m') : mb_substr($name, 0, 100));
        $this->em->persist($outfit);
        $this->em->flush();

        return $outfit;
    }

    /** La suggestion du jour encore ouverte, s'il y en a une. */
    public function current(Profile $me): ?OutfitSuggestion
    {
        return $this->em->createQueryBuilder()
            ->select('s')->from(OutfitSuggestion::class, 's')
            ->where('s.profile = :me')->andWhere('s.status = :proposed')->andWhere('s.generatedAt >= :today')
            ->setParameter('me', $me)->setParameter('proposed', SuggestionStatus::Proposed)
            ->setParameter('today', $this->clock->now()->setTime(0, 0))
            ->orderBy('s.generatedAt', 'DESC')->setMaxResults(1)
            ->getQuery()->getOneOrNullResult();
    }

    /**
     * Ce que l'app affiche : contexte, raisons, pièces (avec la dernière
     * fois qu'elles ont été portées).
     *
     * @return array<string, mixed>
     */
    public function describe(OutfitSuggestion $suggestion): array
    {
        $kept = $suggestion->getKeptGarments();
        $worn = $this->lastWorn($suggestion->getProfile(), $kept);
        $explanation = $suggestion->getExplanation();

        return [
            'id' => (string) $suggestion->getId(),
            'occasion' => $suggestion->getOccasion()->value,
            'status' => $suggestion->getStatus()->value,
            'generatedAt' => $suggestion->getGeneratedAt()->format(\DATE_ATOM),
            'forecast' => $explanation['forecast'] ?? null,
            'source' => $explanation['source'] ?? 'RULES',
            'model' => $explanation['model'] ?? null,
            'reasons' => $explanation['reasons'] ?? [],
            'pieces' => array_map(fn (Garment $g) => [
                'id' => (string) $g->getId(),
                'name' => $g->getName(),
                'category' => $g->getCategory()?->getName(),
                'categorySlug' => $g->getCategory()?->getSlug(),
                'slot' => OutfitEngine::slot((string) $g->getCategory()?->getSlug(), $g->getCategory()?->getParent()?->getSlug()),
                'photo' => $g->getPhotos()[0] ?? null,
                'lastWornAt' => isset($worn[(string) $g->getId()]) ? $worn[(string) $g->getId()]->format('Y-m-d') : null,
                'daysSinceWorn' => isset($worn[(string) $g->getId()]) ? $this->days($worn[(string) $g->getId()]) : null,
            ], $kept),
        ];
    }

    /**
     * Les raisons de « Pourquoi cette tenue », en codes et valeurs : l'app
     * les met en phrases dans la langue de l'utilisateur.
     *
     * @param array<string, 'LIKE'|'DISLIKE'> $stylePrefs
     *
     * @return list<array<string, mixed>>
     */
    private function reasons(OutfitCandidate $outfit, string $occasion, ?Forecast $forecast, array $stylePrefs, ?string $aiReason): array
    {
        $reasons = [];
        if (null !== $forecast) {
            $outer = $outfit->slot('outer');
            $reasons[] = ['code' => 'weather', 'temperature' => $forecast->temperature, 'min' => $forecast->min, 'max' => $forecast->max, 'weather' => $forecast->weather->value, 'wet' => $forecast->isWet(), 'place' => $forecast->place, 'outer' => $outer?->name, 'outerCategory' => $outer?->categorySlug];
        } else {
            $reasons[] = ['code' => 'noWeather'];
        }

        $styles = [];
        foreach ($outfit->pieces as $piece) {
            foreach ($piece->styleNames as $style) {
                $styles[$style] = ($styles[$style] ?? 0) + 1;
            }
        }
        arsort($styles);
        $reasons[] = ['code' => 'occasion', 'occasion' => $occasion, 'styles' => \array_slice(array_keys($styles), 0, 2)];

        // La pièce principale qui n'a pas été portée depuis le plus longtemps (jamais = la plus ancienne).
        $main = array_values(array_filter($outfit->pieces, static fn (Piece $p) => \in_array($p->slot, ['outer', 'top', 'dress', 'bottom'], true)));
        usort($main, static fn (Piece $a, Piece $b) => ($b->daysSinceWorn ?? 999) <=> ($a->daysSinceWorn ?? 999));
        if (isset($main[0]) && (null === $main[0]->daysSinceWorn || $main[0]->daysSinceWorn >= 4)) {
            $reasons[] = ['code' => 'notWorn', 'garment' => $main[0]->name, 'days' => $main[0]->daysSinceWorn];
        }

        $reasons[] = ['code' => 'harmony', 'kind' => $outfit->harmony];

        foreach ($outfit->pieces as $piece) {
            foreach ($piece->styleIds as $i => $id) {
                if ('LIKE' === ($stylePrefs[$id] ?? null)) {
                    $reasons[] = ['code' => 'liked', 'style' => $piece->styleNames[$i] ?? null];
                    break 2;
                }
            }
        }

        if (null !== $aiReason) {
            $reasons[] = ['code' => 'ai', 'text' => $aiReason];
        }

        return $reasons;
    }

    /**
     * Le dressing tel que le moteur le lit. $keep : des pièces à inclure
     * même si elles viennent d'être écartées (celle qu'on remplace).
     *
     * @param list<Garment> $keep
     *
     * @return array{0: list<Piece>, 1: array<string, Garment>}
     */
    private function wardrobe(Profile $me, array $keep = []): array
    {
        /** @var list<Garment> $garments */
        $garments = $this->em->createQueryBuilder()
            ->select('g', 'c', 'p')->from(Garment::class, 'g')
            ->join('g.category', 'c')->leftJoin('c.parent', 'p')
            ->where('g.owner = :me')->andWhere('g.deletedAt IS NULL')->andWhere('g.availability = :available')
            ->andWhere(\sprintf('NOT EXISTS (SELECT 1 FROM %s x WHERE x.garment = g AND x.profile = :me AND x.reactivatedAt IS NULL)', GarmentExclusion::class))
            ->setParameter('me', $me)->setParameter('available', Availability::Available)
            ->getQuery()->getResult();
        foreach ($keep as $garment) {
            if (!\in_array($garment, $garments, true)) {
                $garments[] = $garment;
            }
        }

        $worn = $this->lastWorn($me, $garments);
        $recent = $this->recentlySuggested($me);
        $pieces = [];
        $byId = [];
        foreach ($garments as $garment) {
            $category = $garment->getCategory();
            $slot = null === $category ? null : OutfitEngine::slot($category->getSlug(), $category->getParent()?->getSlug());
            if (null === $slot) {
                continue;
            }
            $id = (string) $garment->getId();
            $byId[$id] = $garment;
            $pieces[] = new Piece(
                $id,
                $garment->getName(),
                $slot,
                $category->getSlug(),
                $category->getName(),
                null === $garment->getEffectiveWarmth() ? 3 : array_search($garment->getEffectiveWarmth()->value, ['VERY_LIGHT', 'LIGHT', 'MID', 'WARM', 'VERY_WARM'], true) + 1,
                $garment->isWaterResistant(),
                $garment->getUsage()->value,
                array_values(array_unique(array_map(static fn ($c) => $c->getFamily()->value, $garment->getColors()->toArray()))),
                array_map(static fn ($c) => (string) $c->getId(), $garment->getColors()->toArray()),
                array_map(static fn ($s) => (string) $s->getId(), $garment->getStyles()->toArray()),
                array_map(static fn ($s) => $s->getName(), $garment->getStyles()->toArray()),
                isset($worn[$id]) ? $this->days($worn[$id]) : null,
                isset($recent[$id]),
            );
        }

        return [$pieces, $byId];
    }

    /**
     * Les goûts qui valent pour cette occasion (sans contexte = toujours).
     *
     * @return array{0: array<string, 'LIKE'|'DISLIKE'>, 1: array<string, 'LIKE'|'DISLIKE'>}
     */
    private function preferences(Profile $me, GarmentUsage $occasion): array
    {
        $colors = [];
        foreach ($this->em->getRepository(ColorPreference::class)->findBy(['profile' => $me]) as $pref) {
            if (null === $pref->getContext() || $pref->getContext() === $occasion) {
                $colors[(string) $pref->getColor()->getId()] = $pref->getSentiment()->value;
            }
        }
        $styles = [];
        foreach ($this->em->getRepository(StylePreference::class)->findBy(['profile' => $me]) as $pref) {
            if (null === $pref->getContext() || $pref->getContext() === $occasion) {
                $styles[(string) $pref->getStyle()->getId()] = $pref->getSentiment()->value;
            }
        }

        return [$colors, $styles];
    }

    /**
     * @param list<Garment> $garments
     *
     * @return array<string, \DateTimeImmutable> la dernière fois que ce profil a porté chaque pièce
     */
    private function lastWorn(Profile $me, array $garments): array
    {
        if ([] === $garments) {
            return [];
        }
        $rows = $this->em->createQueryBuilder()
            ->select('IDENTITY(w.garment) AS garment', 'MAX(w.wornAt) AS last')->from(WearLog::class, 'w')
            ->where('w.profile = :me')->andWhere('w.garment IN (:garments)')
            ->setParameter('me', $me)->setParameter('garments', $garments)
            ->groupBy('w.garment')->getQuery()->getArrayResult();
        $last = [];
        foreach ($rows as $row) {
            $last[(string) $row['garment']] = new \DateTimeImmutable((string) $row['last']);
        }

        return $last;
    }

    /** @return array<string, true> les pièces proposées ces deux derniers jours sans être retenues */
    private function recentlySuggested(Profile $me): array
    {
        $rows = $this->em->createQueryBuilder()
            ->select('IDENTITY(sg.garment) AS garment')->from(OutfitSuggestionGarment::class, 'sg')->join('sg.suggestion', 's')
            ->where('s.profile = :me')->andWhere('s.generatedAt >= :since')->andWhere('s.status != :accepted')
            ->setParameter('me', $me)->setParameter('since', $this->clock->now()->modify('-2 days'))
            ->setParameter('accepted', SuggestionStatus::Accepted)
            ->getQuery()->getArrayResult();

        return array_fill_keys(array_map(static fn (array $r) => (string) $r['garment'], $rows), true);
    }

    /** La météo de la ville du logement principal, quand le téléphone ne donne pas sa position. */
    private function homeForecast(Profile $me): ?Forecast
    {
        $places = $this->em->getRepository(Place::class)->findBy(['owner' => $me], ['createdAt' => 'ASC']);
        foreach ($places as $place) {
            if (null !== $place->getAddress() && '' !== trim($place->getAddress())) {
                return $this->weather->forAddress($place->getAddress());
            }
        }

        return null;
    }

    /** @param array<string, mixed>|null $data */
    private static function forecastFrom(?array $data): ?Forecast
    {
        if (null === $data || !isset($data['temperature'], $data['weather'])) {
            return null;
        }

        return new Forecast((int) $data['temperature'], (int) ($data['min'] ?? $data['temperature']), (int) ($data['max'] ?? $data['temperature']), Weather::from((string) $data['weather']), (int) ($data['rainChance'] ?? 0), $data['place'] ?? null);
    }

    private function days(\DateTimeImmutable $date): int
    {
        return (int) $date->setTime(0, 0)->diff($this->clock->now()->setTime(0, 0))->days;
    }
}
