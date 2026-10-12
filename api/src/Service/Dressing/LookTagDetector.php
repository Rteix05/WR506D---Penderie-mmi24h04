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
 * L'app découpe la photo autour du point (le vêtement visé est au centre)
 * et envoie ce gros plan. Le modèle reçoit aussi la liste des vêtements du
 * dressing, numérotés : il répond par le numéro du vêtement reconnu, ou
 * décrit un vêtement nouveau avec les champs du scan, ce qui pré-remplit
 * son ajout. Un seul appel par point, avec la chaîne de modèles gratuits
 * du scan (OpenRouterVision).
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

    public function detect(LookTag $tag, string $imageBytes, string $mimeType): void
    {
        $candidates = $this->candidates($tag);

        try {
            $answer = $this->vision->ask($this->prompt($candidates), $imageBytes, $mimeType);
        } catch (VisionUnavailable $e) {
            $tag->detected(null, null, ['error' => $e->getMessage(), 'attempts' => $e->attempts]);

            return;
        }

        // Le numéro doit désigner un vêtement de la liste ; sinon, c'est un vêtement nouveau.
        $index = $answer->data['match'] ?? null;
        $match = \is_int($index) || (\is_string($index) && ctype_digit($index)) ? ($candidates[(int) $index - 1] ?? null) : null;
        $suggestion = null === $match ? $this->scan->photoSuggestion(['type' => 'GARMENT'] + $answer->data) : null;

        $tag->detected($match, $suggestion, ['model' => $answer->model, 'attempts' => $answer->failedAttempts, 'answer' => $answer->data]);
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
    private function prompt(array $candidates): string
    {
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
            La photo est un gros plan découpé dans une photo de tenue : le vêtement, la chaussure
            ou l'accessoire porté AU CENTRE de l'image est celui à identifier. Ignore le reste.

            Voici les vêtements déjà enregistrés dans son dressing, numérotés :
            {$dressing}

            Si le vêtement du centre est l'un d'eux (même type, mêmes couleurs, même marque si visible),
            réponds avec son numéro dans "match". Dans le doute, ne choisis pas : match = null.
            Si match = null, décris le vêtement pour pouvoir l'ajouter au dressing.

            Réponds UNIQUEMENT avec un objet JSON, sans texte autour, de cette forme :
            {
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
