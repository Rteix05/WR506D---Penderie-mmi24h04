<?php

namespace App\ReferenceData;

use App\Entity\Reference\AbstractCategory;
use App\Entity\Reference\Brand;
use App\Entity\Reference\Color;
use App\Entity\Reference\GarmentCategory;
use App\Entity\Reference\ItemCategory;
use App\Entity\Reference\SizeSystem;
use App\Entity\Reference\SizeValue;
use App\Entity\Reference\Style;
use App\Enum\Reference\SizeSystemCode;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Charge les référentiels de l'application (ReferenceData/*) en base.
 *
 * Idempotent : chaque ligne est retrouvée par sa clé naturelle (code,
 * slug, nom), créée si elle manque, mise à jour sinon. Rien n'est jamais
 * supprimé : une catégorie ou une taille retirée de la liste peut encore
 * être utilisée par des vêtements. Relancer la commande est donc sans
 * risque, en dev comme en production.
 */
final class ReferenceDataLoader
{
    /** @var array<string, array{created: int, updated: int}> */
    private array $report = [];

    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    /** @return array<string, array{created: int, updated: int}> */
    public function load(): array
    {
        $this->report = [];

        $this->em->wrapInTransaction(function (): void {
            $systems = $this->loadSizeSystems();
            $this->loadGarmentCategories($systems);
            $this->loadItemCategories();
            $this->loadColors();
            $this->loadStyles();
            $this->loadBrands();
        });

        return $this->report;
    }

    /** @return array<string, SizeSystem> par code */
    private function loadSizeSystems(): array
    {
        $systems = [];
        foreach (SizeSystems::all() as $code => $data) {
            $system = $this->em->getRepository(SizeSystem::class)->findOneBy(['code' => SizeSystemCode::from($code)]);
            if (null === $system) {
                $system = new SizeSystem(SizeSystemCode::from($code), $data['name']);
                $this->em->persist($system);
                $this->count('size_system', true);
            } else {
                $this->count('size_system', false);
            }
            $system->setName($data['name'])->setUnit($data['unit'])->setAllowsFreeText($data['allowsFreeText']);

            $existing = [];
            foreach ($system->getValues() as $value) {
                $existing[$value->getLabel()] = $value;
            }
            foreach ($data['values'] as $order => $label) {
                if (isset($existing[$label])) {
                    $existing[$label]->setSortOrder($order);
                    $this->count('size_value', false);
                } else {
                    $this->em->persist(new SizeValue($system, $label, $order));
                    $this->count('size_value', true);
                }
            }
            $systems[$code] = $system;
        }
        $this->em->flush();

        return $systems;
    }

    /** @param array<string, SizeSystem> $systems */
    private function loadGarmentCategories(array $systems): void
    {
        foreach (GarmentCategories::tree() as $slug => $root) {
            /** @var GarmentCategory $parent */
            $parent = $this->systemCategory(GarmentCategory::class, $slug, $root['name'], 'garment_category');
            $parent->setParent(null)->setSizeSystem(null)->setDefaultWarmth(null);
            foreach ($root['children'] as $childSlug => $leaf) {
                /** @var GarmentCategory $child */
                $child = $this->systemCategory(GarmentCategory::class, $childSlug, $leaf['name'], 'garment_category');
                $child->setParent($parent)
                    ->setSizeSystem(null === $leaf['size'] ? null : $systems[$leaf['size']->value])
                    ->setDefaultWarmth($leaf['warmth']);
            }
        }
        $this->em->flush();
    }

    private function loadItemCategories(): void
    {
        foreach (ItemCategories::tree() as $slug => $root) {
            /** @var ItemCategory $parent */
            $parent = $this->systemCategory(ItemCategory::class, $slug, $root['name'], 'item_category');
            $parent->setParent(null);
            foreach ($root['children'] as $childSlug => $name) {
                /** @var ItemCategory $child */
                $child = $this->systemCategory(ItemCategory::class, $childSlug, $name, 'item_category');
                $child->setParent($parent);
            }
        }
        $this->em->flush();
    }

    /**
     * @template T of AbstractCategory
     *
     * @param class-string<T> $class
     *
     * @return T
     */
    private function systemCategory(string $class, string $slug, string $name, string $label): AbstractCategory
    {
        $category = $this->em->getRepository($class)->findOneBy(['slug' => $slug, 'owner' => null]);
        if (null === $category) {
            $category = new $class($name, null, $slug);
            $this->em->persist($category);
            $this->count($label, true);
        } else {
            $category->setName($name);
            $this->count($label, false);
        }

        return $category;
    }

    private function loadColors(): void
    {
        foreach (Colors::all() as $data) {
            $color = $this->em->getRepository(Color::class)->findOneBy(['name' => $data['name']]);
            if (null === $color) {
                $this->em->persist(new Color($data['name'], $data['hex'], $data['family']));
                $this->count('color', true);
            } else {
                $color->update($data['hex'], $data['family']);
                $this->count('color', false);
            }
        }
        $this->em->flush();
    }

    private function loadStyles(): void
    {
        foreach (Styles::all() as $slug => $name) {
            $style = $this->em->getRepository(Style::class)->findOneBy(['slug' => $slug]);
            if (null === $style) {
                $this->em->persist(new Style($slug, $name));
                $this->count('style', true);
            } else {
                $style->setName($name);
                $this->count('style', false);
            }
        }
        $this->em->flush();
    }

    private function loadBrands(): void
    {
        $seen = [];
        foreach (Brands::all() as $name) {
            $slug = Brand::slugify($name);
            if (isset($seen[$slug])) {
                throw new \LogicException(\sprintf('Marque en double dans Brands::all() : « %s » et « %s ».', $seen[$slug], $name));
            }
            $seen[$slug] = $name;

            $brand = $this->em->getRepository(Brand::class)->findOneBy(['slug' => $slug]);
            if (null === $brand) {
                $this->em->persist(Brand::reference($name));
                $this->count('brand', true);
            } else {
                // Une marque proposée par un utilisateur entre dans la liste :
                // elle devient vérifiée, et prend l'orthographe de référence.
                $brand->rename($name)->verify();
                $this->count('brand', false);
            }
        }
        $this->em->flush();
    }

    private function count(string $table, bool $created): void
    {
        $this->report[$table] ??= ['created' => 0, 'updated' => 0];
        ++$this->report[$table][$created ? 'created' : 'updated'];
    }
}
