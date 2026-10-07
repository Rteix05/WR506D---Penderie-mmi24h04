<?php

namespace App\ReferenceData;

/**
 * L'arbre des catégories d'objets fournies par l'application.
 * Un profil peut créer les siennes, sous ces racines ou à côté.
 */
final class ItemCategories
{
    /**
     * @return array<string, array{name: string, children: array<string, string>}>
     */
    public static function tree(): array
    {
        return [
            'electromenager' => ['name' => 'Électroménager', 'children' => [
                'gros-electromenager' => 'Gros électroménager',
                'petit-electromenager' => 'Petit électroménager',
            ]],
            'high-tech' => ['name' => 'High-tech', 'children' => [
                'informatique' => 'Informatique',
                'telephonie' => 'Téléphonie et tablettes',
                'tv-audio' => 'TV, son et vidéo',
                'photo' => 'Photo',
                'jeux-video' => 'Jeux vidéo et consoles',
            ]],
            'maison' => ['name' => 'Maison', 'children' => [
                'mobilier' => 'Mobilier',
                'decoration' => 'Décoration',
                'luminaires' => 'Luminaires',
                'linge-maison' => 'Linge de maison',
                'cuisine-vaisselle' => 'Cuisine et vaisselle',
            ]],
            'bricolage-jardin' => ['name' => 'Bricolage et jardin', 'children' => [
                'outillage' => 'Outillage',
                'quincaillerie' => 'Quincaillerie',
                'jardinage' => 'Jardinage',
                'mobilier-exterieur' => 'Mobilier d\'extérieur',
            ]],
            'loisirs' => ['name' => 'Loisirs', 'children' => [
                'livres' => 'Livres et BD',
                'musique-films' => 'Musique et films',
                'jeux-jouets' => 'Jeux et jouets',
                'instruments' => 'Instruments de musique',
                'loisirs-creatifs' => 'Loisirs créatifs',
            ]],
            'sport-plein-air' => ['name' => 'Sport et plein air', 'children' => [
                'materiel-sport' => 'Matériel de sport',
                'camping' => 'Camping et randonnée',
                'velos-mobilite' => 'Vélos et mobilité',
            ]],
            'enfance' => ['name' => 'Enfance', 'children' => [
                'puericulture' => 'Puériculture',
                'jouets-enfant' => 'Jouets',
            ]],
            'voyage' => ['name' => 'Voyage', 'children' => [
                'bagagerie' => 'Bagagerie',
            ]],
            'papiers-souvenirs' => ['name' => 'Papiers et souvenirs', 'children' => [
                'documents' => 'Documents',
                'souvenirs' => 'Souvenirs et objets de famille',
            ]],
            'autre' => ['name' => 'Autre', 'children' => []],
        ];
    }
}
