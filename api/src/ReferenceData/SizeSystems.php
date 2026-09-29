<?php

namespace App\ReferenceData;

use App\Enum\Reference\SizeSystemCode;

/**
 * Les échelles de tailles et leurs graduations, dans l'ordre de tri.
 * L'ordre du tableau donne sortOrder : ne pas trier alphabétiquement.
 */
final class SizeSystems
{
    /**
     * @return array<string, array{name: string, unit: ?string, allowsFreeText: bool, values: list<string>}>
     */
    public static function all(): array
    {
        $shoes = [];
        foreach (range(16, 50) as $size) {
            $shoes[] = (string) $size;
            if ($size >= 35 && $size <= 46) {
                $shoes[] = $size.',5';
            }
        }

        $waistLength = [];
        foreach (range(24, 40) as $waist) {
            foreach ([28, 30, 32, 34, 36] as $length) {
                $waistLength[] = "W$waist L$length";
            }
        }

        return [
            SizeSystemCode::EuShoe->value => [
                'name' => 'Pointure européenne',
                'unit' => null,
                // Une pointure US ou UK reste saisissable en texte.
                'allowsFreeText' => true,
                'values' => $shoes,
            ],
            SizeSystemCode::Alpha->value => [
                'name' => 'Taille lettre',
                'unit' => null,
                // Certaines marques ont leurs propres tailles (« 1 », « 2 »…).
                'allowsFreeText' => true,
                'values' => ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'],
            ],
            SizeSystemCode::WaistLength->value => [
                'name' => 'Tour de taille et longueur (W/L)',
                'unit' => null,
                'allowsFreeText' => false,
                'values' => $waistLength,
            ],
            SizeSystemCode::FrNumeric->value => [
                'name' => 'Taille française',
                'unit' => null,
                'allowsFreeText' => false,
                'values' => array_map('strval', range(32, 56, 2)),
            ],
            SizeSystemCode::Collar->value => [
                'name' => 'Tour de cou',
                'unit' => 'cm',
                'allowsFreeText' => false,
                'values' => array_map('strval', range(36, 46)),
            ],
            SizeSystemCode::BeltCm->value => [
                'name' => 'Longueur de ceinture',
                'unit' => 'cm',
                'allowsFreeText' => false,
                'values' => array_map('strval', range(70, 130, 5)),
            ],
            SizeSystemCode::OneSize->value => [
                'name' => 'Taille unique',
                'unit' => null,
                'allowsFreeText' => false,
                'values' => ['TU'],
            ],
            SizeSystemCode::KidsAge->value => [
                'name' => 'Taille enfant',
                'unit' => null,
                'allowsFreeText' => false,
                'values' => ['Naissance', '1 mois', '3 mois', '6 mois', '9 mois', '12 mois', '18 mois', '2 ans', '3 ans', '4 ans', '5 ans', '6 ans', '8 ans', '10 ans', '12 ans', '14 ans', '16 ans'],
            ],
        ];
    }
}
