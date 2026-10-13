<?php

namespace App\Service\Dressing;

use App\Entity\Dressing\LookTag;
use App\Entity\Inventory\Garment;
use App\Service\Scan\OpenRouterVision;
use App\Service\Scan\ScanAnalyzer;
use App\Service\Scan\VisionUnavailable;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Identifie le vêtement sous un point d'un look du jour.
 *
 * L'app découpe la photo autour du point et envoie ce gros plan, avec
 * l'endroit où elle l'a découpé (crop) : on sait donc où tombe le point
 * sur le gros plan (au centre, sauf près d'un bord de la photo). La
 * consigne donne cette position au modèle et lui demande de ne regarder
 * QUE le vêtement sous le point, et de le DÉLIMITER (box). Le modèle
 * reçoit aussi la liste des vêtements du dressing, numérotés : il répond
 * par le numéro du vêtement reconnu, ou décrit un vêtement nouveau avec
 * les champs du scan, ce qui pré-remplit son ajout. Un seul appel par
 * point, avec la chaîne de modèles gratuits du scan (OpenRouterVision).
 *
 * Si son contour ne contient pas le point, le modèle a identifié un autre
 * vêtement (celui d'à côté) : sa réponse est écartée et le point reste à
 * désigner, plutôt que de proposer le mauvais vêtement.
 *
 * Le modèle ne voit que du texte pour le dressing (nom, catégorie,
 * couleurs, marque), pas les photos : les modèles gratuits refusent
 * plusieurs images par requête, ou deviennent trop lents.
 */
final class LookTagDetector
{
    /** Au-delà, la consigne devient trop longue pour les petits modèles. */
    private const MAX_CANDIDATES = 80;

    public function __construct(
        private readonly OpenRouterVision $vision,
        private readonly ScanAnalyzer $scan,
        private readonly EntityManagerInterface $em,
    ) {
    }

    /** Tolérance autour du contour : les rectangles des petits modèles sont approximatifs. */
    private const BOX_MARGIN = 0.08;

    /**
     * @param array{x: float, y: float, w: float, h: float}|null $crop où le gros plan a été découpé
     *                                                                 dans la photo (de 0 à 1) ; inconnu,
     *                                                                 on suppose le point au centre
     */
    public function detect(LookTag $tag, string $imageBytes, string $mimeType, ?array $crop = null): void
    {
        $candidates = $this->candidates($tag);
        // Le point sur le gros plan.
        $px = null === $crop ? 0.5 : self::clamp(($tag->getX() - $crop['x']) / $crop['w']);
        $py = null === $crop ? 0.5 : self::clamp(($tag->getY() - $crop['y']) / $crop['h']);

        try {
            $answer = $this->vision->ask($this->prompt($candidates, $px, $py), $imageBytes, $mimeType);
        } catch (VisionUnavailable $e) {
            $tag->detected(null, null, ['error' => $e->getMessage(), 'attempts' => $e->attempts]);

            return;
        }
        $trace = ['model' => $answer->model, 'attempts' => $answer->failedAttempts, 'answer' => $answer->data];

        // Le contour doit contenir le point : sinon le modèle a regardé le vêtement d'à côté.
        $box = self::box($answer->data['box'] ?? null);
        if (null !== $box && !self::contains($box, $px, $py)) {
            $tag->detected(null, null, $trace + ['offTarget' => true]);

            return;
        }

        // Le numéro doit désigner un vêtement de la liste ; sinon, c'est un vêtement nouveau.
        $index = $answer->data['match'] ?? null;
        $match = \is_int($index) || (\is_string($index) && ctype_digit($index)) ? ($candidates[(int) $index - 1] ?? null) : null;
        $suggestion = null === $match ? $this->scan->photoSuggestion(['type' => 'GARMENT'] + $answer->data) : null;

        $tag->detected($match, $suggestion, $trace, null === $box || null === $crop ? null : self::onPhoto($box, $crop));
    }

    /**
     * Lit le contour rendu par le modèle : [gauche, haut, droite, bas], de 0
     * à 1. Certains modèles répondent en pourcentages ou sur 1 000 : on
     * ramène à 0–1. Illisible ou vide : null.
     *
     * @return array{x0: float, y0: float, x1: float, y1: float}|null
     */
    public static function box(mixed $raw): ?array
    {
        if (!\is_array($raw) || 4 !== \count($raw)) {
            return null;
        }
        $values = array_values($raw);
        foreach ($values as $v) {
            if (!is_numeric($v) || $v < 0) {
                return null;
            }
        }
        $max = max(array_map('floatval', $values));
        $scale = $max <= 1 ? 1 : ($max <= 100 ? 100 : 1000);
        [$x0, $y0, $x1, $y1] = array_map(static fn ($v) => self::clamp((float) $v / $scale), $values);
        if ($x1 - $x0 < 0.02 || $y1 - $y0 < 0.02) {
            return null;
        }

        return ['x0' => $x0, 'y0' => $y0, 'x1' => $x1, 'y1' => $y1];
    }

    /** @param array{x0: float, y0: float, x1: float, y1: float} $box */
    private static function contains(array $box, float $x, float $y): bool
    {
        return $x >= $box['x0'] - self::BOX_MARGIN && $x <= $box['x1'] + self::BOX_MARGIN
            && $y >= $box['y0'] - self::BOX_MARGIN && $y <= $box['y1'] + self::BOX_MARGIN;
    }

    /**
     * Du gros plan à la photo du look.
     *
     * @param array{x0: float, y0: float, x1: float, y1: float} $box
     * @param array{x: float, y: float, w: float, h: float}     $crop
     *
     * @return array{x0: float, y0: float, x1: float, y1: float}
     */
    private static function onPhoto(array $box, array $crop): array
    {
        return [
            'x0' => round(self::clamp($crop['x'] + $box['x0'] * $crop['w']), 4),
            'y0' => round(self::clamp($crop['y'] + $box['y0'] * $crop['h']), 4),
            'x1' => round(self::clamp($crop['x'] + $box['x1'] * $crop['w']), 4),
            'y1' => round(self::clamp($crop['y'] + $box['y1'] * $crop['h']), 4),
        ];
    }

    private static function clamp(float $v): float
    {
        return min(max($v, 0.0), 1.0);
    }

    /**
     * Les vêtements du propriétaire du look, encore là, les plus récents
     * d'abord (ce qu'on porte le plus souvent).
     *
     * @return list<Garment>
     */
    private function candidates(LookTag $tag): array
    {
        return $this->em->getRepository(Garment::class)->findBy(
            ['owner' => $tag->getLook()->getOwner(), 'deletedAt' => null],
            ['createdAt' => 'DESC'],
            self::MAX_CANDIDATES,
        );
    }

    /** @param list<Garment> $candidates */
    private function prompt(array $candidates, float $px, float $py): string
    {
        $left = (int) round($px * 100);
        $top = (int) round($py * 100);
        $where = 50 === $left && 50 === $top
            ? 'au CENTRE exact de l\'image'
            : \sprintf('à %d %% de la largeur depuis la gauche et %d %% de la hauteur depuis le haut', $left, $top);
        $lines = [];
        foreach ($candidates as $i => $garment) {
            $colors = implode(', ', array_map(static fn ($c) => $c->getName(), $garment->getColors()->toArray()));
            $lines[] = \sprintf('%d. %s — %s%s%s', $i + 1, $garment->getName(), $garment->getCategory()->getName(),
                '' === $colors ? '' : ' — '.$colors,
                null === $garment->getBrand() ? '' : ' — '.$garment->getBrand()->getName());
        }
        $dressing = [] === $lines ? '(le dressing est vide)' : implode("\n", $lines);
        $catalogue = ScanAnalyzer::catalogue();

        return <<<PROMPT
            Tu aides à ranger un dressing (application Penderie, en français).
            La photo est un gros plan découpé dans une photo de tenue. L'utilisateur a posé un point
            {$where} : le vêtement, la chaussure ou l'accessoire porté qui se trouve SOUS CE POINT
            est le seul à identifier. Plusieurs vêtements peuvent être visibles (un t-shirt sous une veste,
            un pantalon sous un manteau) : ne décris que celui qui est exactement sous le point, ignore
            les autres, même s'ils sont plus grands ou plus visibles.

            Délimite ce vêtement : "box" est le plus petit rectangle qui l'entoure en entier sur cette image,
            [gauche, haut, droite, bas], en fractions de 0 à 1 (0,0 = coin haut gauche ; 1,1 = coin bas droit).
            Ce rectangle contient forcément le point.

            Voici les vêtements déjà enregistrés dans son dressing, numérotés :
            {$dressing}

            Si le vêtement sous le point est l'un d'eux (même type, mêmes couleurs, même marque si visible),
            réponds avec son numéro dans "match". Dans le doute, ne choisis pas : match = null.
            Si match = null, décris le vêtement pour pouvoir l'ajouter au dressing.

            Réponds UNIQUEMENT avec un objet JSON, sans texte autour, de cette forme :
            {
              "box": [gauche, haut, droite, bas],
              "match": numéro du vêtement reconnu ou null,
              "name": "nom court en français, ex. « Jean slim bleu »" ou null,
              "description": "une phrase" ou null,
              "category": "un slug de vêtement de la liste" ou null,
              "brand": "marque lisible ou évidente" ou null,
              "colors": ["noms pris dans la liste des couleurs"],
              "confidence": nombre entre 0 et 1
            }
            N'invente rien : une information absente ou illisible vaut null (ou une liste vide).

            {$catalogue}
            PROMPT;
    }
}
