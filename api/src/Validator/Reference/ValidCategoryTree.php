<?php

namespace App\Validator\Reference;

use Symfony\Component\Validator\Constraint;

/**
 * Un arbre de catégories cohérent : pas de cycle, profondeur bornée, et
 * pas de mélange des propriétaires (une catégorie système ne descend que
 * d'une catégorie système ; une catégorie d'un profil descend d'une
 * catégorie système ou d'une des siennes).
 */
#[\Attribute(\Attribute::TARGET_CLASS)]
final class ValidCategoryTree extends Constraint
{
    public string $cycle = 'Une catégorie ne peut pas être sa propre ancêtre.';
    public string $tooDeep = 'Une catégorie ne peut pas dépasser {{ max }} niveaux.';
    public string $systemUnderUser = 'Une catégorie système ne peut pas descendre d\'une catégorie personnelle.';
    public string $foreignParent = 'Cette catégorie parente appartient à un autre profil.';

    public function getTargets(): string
    {
        return self::CLASS_CONSTRAINT;
    }
}
