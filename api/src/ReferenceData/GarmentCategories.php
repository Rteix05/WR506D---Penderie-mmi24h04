<?php

namespace App\ReferenceData;

use App\Enum\Reference\SizeSystemCode as S;
use App\Enum\Reference\Warmth as W;

/**
 * L'arbre des catégories de vêtements fournies par l'application.
 *
 * Chaque feuille déclare son échelle de tailles et sa chaleur par défaut ;
 * les parents n'en ont pas. La branche « Enfant » utilise KIDS_AGE, sauf
 * les chaussures, qui restent en pointure (la pointure EU part de 16).
 */
final class GarmentCategories
{
    /**
     * @return array<string, array{name: string, children: array<string, array{name: string, size: ?S, warmth: ?W}>}>
     */
    public static function tree(): array
    {
        return [
            'hauts' => ['name' => 'Hauts', 'children' => [
                't-shirts' => self::leaf('T-shirts', S::Alpha, W::Light),
                'chemises' => self::leaf('Chemises', S::Alpha, W::Light),
                'tops' => self::leaf('Tops et débardeurs', S::Alpha, W::VeryLight),
                'pulls' => self::leaf('Pulls et gilets', S::Alpha, W::Warm),
                'sweats' => self::leaf('Sweats', S::Alpha, W::Mid),
            ]],
            'bas' => ['name' => 'Bas', 'children' => [
                'jeans' => self::leaf('Jeans', S::WaistLength, W::Mid),
                'pantalons' => self::leaf('Pantalons', S::FrNumeric, W::Mid),
                'joggings' => self::leaf('Joggings', S::Alpha, W::Mid),
                'shorts' => self::leaf('Shorts', S::Alpha, W::VeryLight),
                'jupes' => self::leaf('Jupes', S::FrNumeric, W::Light),
            ]],
            'robes-combinaisons' => ['name' => 'Robes et combinaisons', 'children' => [
                'robes' => self::leaf('Robes', S::FrNumeric, W::Light),
                'combinaisons' => self::leaf('Combinaisons', S::FrNumeric, W::Light),
            ]],
            'vestes-manteaux' => ['name' => 'Vestes et manteaux', 'children' => [
                'vestes' => self::leaf('Vestes', S::Alpha, W::Mid),
                'blazers' => self::leaf('Blazers', S::FrNumeric, W::Mid),
                'impermeables' => self::leaf('Imperméables', S::Alpha, W::Mid),
                'manteaux' => self::leaf('Manteaux', S::Alpha, W::VeryWarm),
                'doudounes' => self::leaf('Doudounes', S::Alpha, W::VeryWarm),
            ]],
            'costumes' => ['name' => 'Costumes et tailleurs', 'children' => [
                'costumes-complets' => self::leaf('Costumes', S::FrNumeric, W::Mid),
                'tailleurs' => self::leaf('Tailleurs', S::FrNumeric, W::Mid),
            ]],
            'chaussures' => ['name' => 'Chaussures', 'children' => [
                'baskets' => self::leaf('Baskets', S::EuShoe, W::Mid),
                'chaussures-ville' => self::leaf('Chaussures de ville', S::EuShoe, W::Mid),
                'bottes' => self::leaf('Bottes et bottines', S::EuShoe, W::Warm),
                'sandales' => self::leaf('Sandales et claquettes', S::EuShoe, W::VeryLight),
                'chaussures-sport' => self::leaf('Chaussures de sport', S::EuShoe, W::Mid),
                'chaussons' => self::leaf('Chaussons', S::EuShoe, W::Warm),
            ]],
            'sport' => ['name' => 'Sport', 'children' => [
                'hauts-sport' => self::leaf('Hauts de sport', S::Alpha, W::Light),
                'bas-sport' => self::leaf('Bas de sport', S::Alpha, W::Light),
                'maillots-bain' => self::leaf('Maillots de bain', S::Alpha, W::VeryLight),
            ]],
            'sous-vetements-nuit' => ['name' => 'Sous-vêtements et nuit', 'children' => [
                'sous-vetements' => self::leaf('Sous-vêtements', S::Alpha, null),
                'chaussettes' => self::leaf('Chaussettes et collants', null, null),
                'pyjamas' => self::leaf('Pyjamas', S::Alpha, W::Mid),
            ]],
            'accessoires' => ['name' => 'Accessoires', 'children' => [
                'ceintures' => self::leaf('Ceintures', S::BeltCm, null),
                'cravates' => self::leaf('Cravates et nœuds papillon', S::OneSize, null),
                'echarpes' => self::leaf('Écharpes et foulards', S::OneSize, W::Warm),
                'bonnets-chapeaux' => self::leaf('Bonnets, casquettes et chapeaux', S::OneSize, null),
                'gants' => self::leaf('Gants', S::Alpha, W::Warm),
                'sacs' => self::leaf('Sacs', S::OneSize, null),
                'bijoux-montres' => self::leaf('Bijoux et montres', null, null),
                'lunettes' => self::leaf('Lunettes', null, null),
            ]],
            'enfant' => ['name' => 'Enfant', 'children' => [
                'enfant-bodies' => self::leaf('Bodies et grenouillères', S::KidsAge, W::Light),
                'enfant-hauts' => self::leaf('Hauts enfant', S::KidsAge, W::Light),
                'enfant-bas' => self::leaf('Bas enfant', S::KidsAge, W::Mid),
                'enfant-robes' => self::leaf('Robes enfant', S::KidsAge, W::Light),
                'enfant-manteaux' => self::leaf('Vestes et manteaux enfant', S::KidsAge, W::VeryWarm),
                'enfant-pyjamas' => self::leaf('Pyjamas enfant', S::KidsAge, W::Mid),
                'enfant-chaussures' => self::leaf('Chaussures enfant', S::EuShoe, W::Mid),
            ]],
        ];
    }

    /** @return array{name: string, size: ?S, warmth: ?W} */
    private static function leaf(string $name, ?S $size, ?W $warmth): array
    {
        return ['name' => $name, 'size' => $size, 'warmth' => $warmth];
    }
}
