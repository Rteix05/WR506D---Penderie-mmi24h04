<?php

namespace App\Validator\Inventory;

use Symfony\Component\Validator\Constraint;

/**
 * La taille d'un vêtement appartient à l'échelle de sa catégorie
 * (garment.size.sizeSystem = garment.category.sizeSystem, règle du MDD),
 * et le texte libre n'est permis que si cette échelle l'autorise, ou si
 * la catégorie n'a pas d'échelle (bijoux, chaussettes « 39-42 »).
 */
#[\Attribute(\Attribute::TARGET_CLASS)]
final class ValidGarmentSize extends Constraint
{
    public string $noScale = 'Cette catégorie n\'a pas d\'échelle de tailles : saisis la taille en texte.';
    public string $otherScale = 'Cette taille n\'appartient pas à l\'échelle de la catégorie ({{ scale }}).';
    public string $freeTextForbidden = 'Choisis une taille dans l\'échelle {{ scale }}.';

    public function getTargets(): string
    {
        return self::CLASS_CONSTRAINT;
    }
}
