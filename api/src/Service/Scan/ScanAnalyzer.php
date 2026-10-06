<?php

namespace App\Service\Scan;

use ApiPlatform\Metadata\IriConverterInterface;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Scan;
use App\Entity\Reference\Brand;
use App\Entity\Reference\Color;
use App\Entity\Reference\GarmentCategory;
use App\Entity\Reference\ItemCategory;
use App\Enum\Inventory\ScanKind;
use App\Enum\Inventory\ScanStatus;
use App\ReferenceData\Colors;
use App\ReferenceData\GarmentCategories;
use App\ReferenceData\ItemCategories;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Les deux modes de scan qui passent par l'IA : la reconnaissance d'un objet
 * sur photo (PHOTO) et la lecture d'une étiquette textile (LABEL_OCR).
 * Code-barres et QR code sont décodés par l'app, sans IA.
 *
 * Le modèle choisit parmi NOS catégories et NOS couleurs (leurs slugs et
 * noms sont dans la consigne) : la réponse se traduit ainsi en IRI que
 * l'app pré-remplit telles quelles. Rien n'est créé ici, sinon la trace
 * Scan — réussie ou non — qui sert à mesurer la fiabilité.
 */
final class ScanAnalyzer
{
    public const PROVIDER = 'openrouter';

    public function __construct(
        private readonly OpenRouterVision $vision,
        private readonly EntityManagerInterface $em,
        private readonly IriConverterInterface $iris,
    ) {
    }

    /** @return array{scan: Scan, suggestion: ?array<string, mixed>, error: ?string} */
    public function analyze(Profile $profile, ScanKind $kind, string $imageBytes, string $mimeType): array
    {
        if (!\in_array($kind, [ScanKind::Photo, ScanKind::LabelOcr], true)) {
            throw new \LogicException('Seuls les scans PHOTO et LABEL_OCR passent par l\'analyse d\'image ; le code-barres et le QR code se décodent dans l\'app.');
        }

        try {
            $answer = $this->vision->ask($this->prompt($kind), $imageBytes, $mimeType);
        } catch (VisionUnavailable $e) {
            return $this->record($profile, $kind, ScanStatus::Failed, ['error' => $e->getMessage(), 'attempts' => $e->attempts], null, $e->getMessage());
        }

        $suggestion = $this->suggestion($answer->data, $kind);
        $raw = ['model' => $answer->model, 'attempts' => $answer->failedAttempts, 'answer' => $answer->data];

        return $this->record($profile, $kind, $this->status($kind, $suggestion), $raw, $suggestion, null);
    }

    /**
     * @param array<string, mixed>      $raw
     * @param array<string, mixed>|null $suggestion
     *
     * @return array{scan: Scan, suggestion: ?array<string, mixed>, error: ?string}
     */
    private function record(Profile $profile, ScanKind $kind, ScanStatus $status, array $raw, ?array $suggestion, ?string $error): array
    {
        $scan = new Scan($profile, $kind, $status, provider: self::PROVIDER, rawData: $raw);
        $this->em->persist($scan);
        $this->em->flush();

        return ['scan' => $scan, 'suggestion' => ScanStatus::Failed === $status ? null : $suggestion, 'error' => $error];
    }

    /**
     * Photo : il faut au moins le nom et la catégorie pour pré-remplir la fiche.
     * Étiquette : la taille et la composition sont ce qu'on vient y chercher.
     *
     * @param array<string, mixed> $s
     */
    private function status(ScanKind $kind, array $s): ScanStatus
    {
        $found = ScanKind::Photo === $kind
            ? [null !== $s['name'], null !== $s['category']]
            : [null !== $s['size'], [] !== $s['composition']];
        $hits = \count(array_filter($found));
        if (ScanKind::LabelOcr === $kind && 0 === $hits && null !== $s['brand']) {
            return ScanStatus::Partial;
        }

        return match ($hits) {
            2 => ScanStatus::Success,
            1 => ScanStatus::Partial,
            default => ScanStatus::Failed,
        };
    }

    /**
     * Ne garde de la réponse que des valeurs du bon type, et traduit
     * catégorie, marque et couleurs en ressources de l'API.
     *
     * @param array<string, mixed> $d
     *
     * @return array<string, mixed>
     */
    private function suggestion(array $d, ScanKind $kind): array
    {
        $type = ScanKind::LabelOcr === $kind || 'ITEM' !== ($d['type'] ?? null) ? 'GARMENT' : 'ITEM';

        return [
            'type' => $type,
            'name' => self::text($d['name'] ?? null),
            'description' => self::text($d['description'] ?? null),
            'category' => $this->category($type, self::text($d['category'] ?? null)),
            'brand' => $this->brand(self::text($d['brand'] ?? null)),
            'colors' => 'GARMENT' === $type ? $this->colors($d['colors'] ?? []) : [],
            'size' => self::text($d['size'] ?? null),
            'composition' => self::composition($d['composition'] ?? []),
            'care' => array_values(array_filter(array_map(self::text(...), \is_array($d['care'] ?? null) ? $d['care'] : []))),
            'madeIn' => self::text($d['madeIn'] ?? null),
            'confidence' => is_numeric($d['confidence'] ?? null) ? max(0.0, min(1.0, (float) $d['confidence'])) : null,
        ];
    }

    /** @return array{iri: string, slug: string, name: string}|null */
    private function category(string $type, ?string $slug): ?array
    {
        if (null === $slug) {
            return null;
        }
        $class = 'ITEM' === $type ? ItemCategory::class : GarmentCategory::class;
        $category = $this->em->getRepository($class)->findOneBy(['slug' => $slug, 'owner' => null]);

        return null === $category ? null : ['iri' => $this->iris->getIriFromResource($category), 'slug' => $category->getSlug(), 'name' => $category->getName()];
    }

    /** Une marque inconnue reste en texte : l'app propose de la créer. */
    private function brand(?string $name): ?array
    {
        if (null === $name) {
            return null;
        }
        $brand = $this->em->getRepository(Brand::class)->findOneBy(['slug' => Brand::slugify($name)]);

        return null === $brand
            ? ['iri' => null, 'name' => $name]
            : ['iri' => $this->iris->getIriFromResource($brand), 'name' => $brand->getName()];
    }

    /** @return list<array{iri: string, name: string}> */
    private function colors(mixed $names): array
    {
        $out = [];
        foreach (\is_array($names) ? $names : [] as $name) {
            $color = \is_string($name) ? $this->em->getRepository(Color::class)->findOneBy(['name' => trim($name)]) : null;
            if (null !== $color) {
                $out[(string) $color->getId()] = ['iri' => $this->iris->getIriFromResource($color), 'name' => $color->getName()];
            }
        }

        return array_values($out);
    }

    /** @return list<array{material: string, percent: ?int}> */
    private static function composition(mixed $parts): array
    {
        $out = [];
        foreach (\is_array($parts) ? $parts : [] as $part) {
            $material = \is_array($part) ? self::text($part['material'] ?? null) : null;
            if (null !== $material) {
                $out[] = ['material' => $material, 'percent' => is_numeric($part['percent'] ?? null) ? (int) $part['percent'] : null];
            }
        }

        return $out;
    }

    private static function text(mixed $value): ?string
    {
        return \is_string($value) && '' !== trim($value) && 'null' !== strtolower(trim($value)) ? trim($value) : null;
    }

    private function prompt(ScanKind $kind): string
    {
        $garments = self::leaves(GarmentCategories::tree());
        $items = self::leaves(ItemCategories::tree());
        $colors = implode(', ', array_column(Colors::all(), 'name'));
        $task = ScanKind::Photo === $kind
            ? "Identifie l'objet principal de la photo. S'il se porte (vêtement, chaussure, accessoire de mode), type = \"GARMENT\" ; sinon type = \"ITEM\". Ne remplis composition, care et madeIn que si une étiquette est lisible."
            : "La photo montre l'étiquette cousue d'un vêtement. Recopie ce qui y est écrit : marque, taille, composition (matière et pourcentage), consignes d'entretien (en mots, pas en symboles), pays de fabrication. type = \"GARMENT\".";

        return <<<PROMPT
            Tu aides à ranger un inventaire domestique (application Penderie, en français).
            {$task}

            Réponds UNIQUEMENT avec un objet JSON, sans texte autour, de cette forme :
            {
              "type": "GARMENT" ou "ITEM",
              "name": "nom court en français, ex. « Jean slim bleu » ou « Perceuse sans fil »" ou null,
              "description": "une phrase" ou null,
              "category": "un slug de la liste qui correspond au type" ou null,
              "brand": "marque lisible ou évidente" ou null,
              "colors": ["noms pris dans la liste des couleurs"],
              "size": "taille telle qu'écrite (M, 42, 32/34…)" ou null,
              "composition": [{"material": "coton", "percent": 95}],
              "care": ["lavage à 30 °C", "pas de sèche-linge"],
              "madeIn": "pays" ou null,
              "confidence": nombre entre 0 et 1
            }
            N'invente rien : une information absente ou illisible vaut null (ou une liste vide).

            Slugs des catégories de vêtements (GARMENT) : {$garments}
            Slugs des catégories d'objets (ITEM) : {$items}
            Couleurs : {$colors}
            PROMPT;
    }

    /** @param array<string, array{name: string, children: array<string, mixed>}> $tree */
    private static function leaves(array $tree): string
    {
        $slugs = [];
        foreach ($tree as $root => $node) {
            $slugs = [...$slugs, ...([] === $node['children'] ? [$root] : array_keys($node['children']))];
        }

        return implode(', ', $slugs);
    }
}
