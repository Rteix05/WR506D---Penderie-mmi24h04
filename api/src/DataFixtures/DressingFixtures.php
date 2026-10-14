<?php

namespace App\DataFixtures;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Place\Box;
use App\Entity\Place\Room;
use App\Entity\Place\Storage;
use App\Entity\Reference\Brand;
use App\Entity\Reference\Color;
use App\Entity\Reference\GarmentCategory;
use App\Entity\Reference\ItemCategory;
use App\Entity\Reference\SizeValue;
use App\Entity\Reference\Style;
use App\Enum\Inventory\Condition;
use App\Enum\Inventory\GarmentUsage;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

/**
 * Vêtements et objets de démonstration, rangés dans les logements de
 * PlaceFixtures.
 *
 * Les catégories, tailles, couleurs, marques et styles viennent des
 * référentiels (app:reference-data:load, chargé AVANT les fixtures) : une
 * valeur absente fait échouer le chargement, plutôt que de créer des
 * données incohérentes.
 *
 * Références : garment-thomas-chemise, garment-thomas-jean.
 */
final class DressingFixtures extends Fixture implements DependentFixtureInterface
{
    private ObjectManager $manager;

    public function getDependencies(): array
    {
        return [PlaceFixtures::class];
    }

    public function load(ObjectManager $manager): void
    {
        $this->manager = $manager;
        $camille = $this->getReference('profile-camille', Profile::class);
        $thomas = $this->getReference('profile-thomas', Profile::class);
        $chambre = $this->getReference('room-camille-chambre', Room::class);
        $entree = $this->getReference('room-camille-entree', Room::class);
        $armoire = $this->getReference('storage-camille-armoire', Storage::class);
        $commode = $this->getReference('storage-camille-commode', Storage::class);
        $hiver = $this->getReference('box-camille-hiver', Box::class);

        // Le dressing de Camille : de quoi remplir les listes et les filtres.
        $this->garment($camille, 'Chemise en lin blanche', $chambre, 'chemises', 'M', ['Blanc'], 'Sézane', ['chic'], $armoire);
        $this->garment($camille, 'T-shirt rayé marinière', $chambre, 't-shirts', 'S', ['Blanc', 'Bleu marine'], 'Saint James', ['casual'], $commode);
        $this->garment($camille, 'Pull col roulé camel', $chambre, 'pulls', 'M', ['Camel'], 'Uniqlo', ['casual', 'chic'], $commode);
        $this->garment($camille, 'Jean droit brut', $chambre, 'jeans', 'W28 L32', ['Bleu'], 'Levi\'s', ['casual'], $armoire);
        $this->garment($camille, 'Robe midi fleurie', $chambre, 'robes', '38', ['Rose'], 'Rouje', ['chic'], $armoire);
        $this->garment($camille, 'Blazer noir', $chambre, 'blazers', '38', ['Noir'], 'Maje', ['work', 'chic'], $armoire)
            ->setUsage(GarmentUsage::Work);
        $this->garment($camille, 'Baskets blanches', $entree, 'baskets', '39', ['Blanc'], 'Veja', ['casual', 'streetwear']);
        $this->garment($camille, 'Manteau long en laine', $chambre, 'manteaux', 'M', ['Gris'], 'Sandro', ['chic'], null, $hiver);
        $this->garment($camille, 'Doudoune légère', $chambre, 'doudounes', 'S', ['Noir'], 'Uniqlo', ['sport'], null, $hiver);

        // Le dressing de Thomas : les deux pièces de son look publié.
        $chambreThomas = $this->getReference('room-thomas-chambre', Room::class);
        $chemise = $this->garment($thomas, 'Chemise en jean', $chambreThomas, 'chemises', 'L', ['Bleu'], 'Levi\'s', ['casual']);
        $jean = $this->garment($thomas, 'Chino beige', $chambreThomas, 'pantalons', '42', ['Beige'], 'Celio', ['casual', 'work']);
        $this->addReference('garment-thomas-chemise', $chemise);
        $this->addReference('garment-thomas-jean', $jean);

        // Des objets (hors vêtements) pour l'inventaire de Camille.
        $this->item($camille, 'Lampe de bureau', $chambre, 'luminaires', Condition::Good, '35.00');
        $this->item($camille, 'Appareil photo argentique', $chambre, 'photo', Condition::Excellent, '120.00', $commode);
        $this->item($camille, 'Perceuse sans fil', $entree, 'outillage', Condition::Worn, null);

        $manager->flush();
    }

    /**
     * @param list<string> $colors noms du référentiel des couleurs
     * @param list<string> $styles slugs du référentiel des styles
     */
    private function garment(
        Profile $owner,
        string $name,
        Room $room,
        string $category,
        string $size,
        array $colors,
        string $brand,
        array $styles,
        ?Storage $storage = null,
        ?Box $box = null,
    ): Garment {
        $category = $this->one(GarmentCategory::class, ['slug' => $category, 'owner' => null]);
        $garment = (new Garment($owner, $name, $room, $category))
            ->setBrand($this->brand($brand))
            ->setSize($this->one(SizeValue::class, ['sizeSystem' => $category->getSizeSystem(), 'label' => $size]))
            ->setCondition(Condition::Good)
            ->setStorage($storage)
            ->setBox($box);
        foreach ($colors as $color) {
            $garment->addColor($this->one(Color::class, ['name' => $color]));
        }
        foreach ($styles as $style) {
            $garment->addStyle($this->one(Style::class, ['slug' => $style]));
        }
        $this->manager->persist($garment);

        return $garment;
    }

    private function item(Profile $owner, string $name, Room $room, string $category, Condition $condition, ?string $value, ?Storage $storage = null): Item
    {
        $item = (new Item($owner, $name, $room, $this->one(ItemCategory::class, ['slug' => $category, 'owner' => null])))
            ->setCondition($condition)
            ->setEstimatedValue($value)
            ->setStorage($storage);
        $this->manager->persist($item);

        return $item;
    }

    /** Une marque du référentiel, ou proposée si elle n'y est pas (comme dans l'app). */
    private function brand(string $name): Brand
    {
        $brand = $this->manager->getRepository(Brand::class)->findOneBy(['name' => $name]);
        if (null === $brand) {
            $brand = Brand::reference($name);
            $this->manager->persist($brand);
        }

        return $brand;
    }

    /**
     * @template T of object
     *
     * @param class-string<T>      $class
     * @param array<string, mixed> $criteria
     *
     * @return T
     */
    private function one(string $class, array $criteria): object
    {
        return $this->manager->getRepository($class)->findOneBy($criteria)
            ?? throw new \RuntimeException(\sprintf('%s introuvable (%s) : lancer app:reference-data:load avant les fixtures.', $class, json_encode($criteria)));
    }
}
