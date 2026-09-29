<?php

namespace App\ReferenceData;

/**
 * La liste prédéfinie des marques, « à la Vinted » : chargées vérifiées.
 * Une marque absente reste saisissable par l'utilisateur (non vérifiée).
 *
 * Pour en ajouter : compléter la liste et relancer
 * app:reference-data:load. Une marque déjà proposée par un utilisateur
 * sous le même slug est alors simplement marquée vérifiée.
 */
final class Brands
{
    /** @return list<string> */
    public static function all(): array
    {
        return [
            // Grande distribution et prêt-à-porter
            'Zara', 'H&M', 'Mango', 'Uniqlo', 'Primark', 'Kiabi', 'C&A', 'Pull&Bear', 'Bershka',
            'Stradivarius', 'Massimo Dutti', 'Promod', 'Camaïeu', 'Jennyfer', 'Pimkie', 'Etam',
            'Naf Naf', 'Cache Cache', 'Bonobo', 'Celio', 'Jules', 'Brice', 'Devred', 'Monoprix',
            'Tex', 'In Extenso', 'Gémo', 'La Halle', 'Bizzbee', 'Undiz', 'Esprit', 'Benetton',
            'Gap', 'Old Navy', 'Asos', 'Shein', 'New Look', 'Topshop', 'Superdry', 'Jack & Jones',
            'Only', 'Vero Moda', 'Vila', 'Selected', 'Springfield', 'Morgan', 'Grain de Malice',
            // Milieu de gamme et créateurs
            'Sézane', 'Maje', 'Sandro', 'The Kooples', 'Claudie Pierlot', 'Comptoir des Cotonniers',
            'Des Petits Hauts', 'Ba&sh', 'Zadig & Voltaire', 'American Vintage', 'Kookaï', 'Petit Bateau',
            'Armor-Lux', 'Saint James', 'Le Slip Français', 'Aigle', 'Faguo', 'Veja', 'Jott',
            'Agnès b.', 'APC', 'Ami Paris', 'Maison Kitsuné', 'Sessùn', 'Rouje', 'Balzac Paris',
            'Galeries Lafayette', 'Cos', '& Other Stories', 'Arket', 'Weekday', 'Levi\'s', 'Lee',
            'Wrangler', 'Diesel', 'Pepe Jeans', 'Tommy Hilfiger', 'Calvin Klein', 'Ralph Lauren',
            'Lacoste', 'Hugo Boss', 'Guess', 'Desigual', 'Scotch & Soda', 'Timberland', 'Barbour',
            // Sport et outdoor
            'Nike', 'Adidas', 'Puma', 'Reebok', 'New Balance', 'Asics', 'Converse', 'Vans',
            'Fila', 'Le Coq Sportif', 'Kappa', 'Under Armour', 'Decathlon', 'Quechua', 'Kalenji',
            'Domyos', 'The North Face', 'Columbia', 'Patagonia', 'Salomon', 'Quiksilver', 'Roxy',
            'Billabong', 'Rip Curl', 'Champion', 'Ellesse', 'Lululemon',
            // Chaussures
            'Dr. Martens', 'Clarks', 'Birkenstock', 'Geox', 'Mephisto', 'Minelli', 'Bocage',
            'André', 'San Marina', 'Eram', 'Jonak', 'UGG', 'Crocs', 'Havaianas', 'Kickers',
            'Palladium', 'Paraboot', 'Timberland Pro', 'Superga', 'Onitsuka Tiger',
            // Enfant
            'Okaïdi', 'Obaïbi', 'Jacadi', 'Cyrillus', 'Du Pareil au Même', 'Vertbaudet', 'Sergent Major',
            'Catimini', 'Tape à l\'œil', 'Bonpoint', 'IKKS', 'Absorba',
            // Luxe
            'Chanel', 'Louis Vuitton', 'Hermès', 'Dior', 'Gucci', 'Prada', 'Saint Laurent',
            'Balenciaga', 'Givenchy', 'Céline', 'Chloé', 'Isabel Marant', 'Kenzo', 'Burberry',
            'Moncler', 'Longchamp', 'Lancel', 'Michael Kors', 'Coach', 'Furla',
        ];
    }
}
