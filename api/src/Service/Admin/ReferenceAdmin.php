<?php

namespace App\Service\Admin;

use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Reference\AbstractCategory;
use App\Entity\Reference\Brand;
use App\Entity\Reference\GarmentCategory;
use App\Entity\Reference\ItemCategory;
use App\Entity\Reference\SizeSystem;
use App\Enum\Reference\Warmth;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Les référentiels gérés depuis le back-office, par le super administrateur
 * seul (ROLE_SUPER_ADMIN) :
 *
 *  - catégories de l'application (objets, vêtements) : ajouter, à la racine
 *    ou sous une catégorie principale ; renommer ; supprimer une catégorie
 *    vide (ni bien rangé dessous, ni sous-catégorie). Le slug, lui, ne
 *    change pas au renommage : l'app et le moteur de suggestion s'en
 *    servent ;
 *  - marques : ajouter (vérifiée d'emblée), valider une marque proposée par
 *    un utilisateur, renommer, fusionner un doublon dans une autre marque
 *    (ses vêtements passent sur l'autre), supprimer une marque inutilisée.
 *
 * Une catégorie ajoutée ici n'est pas dans src/ReferenceData :
 * app:reference-data:load la laisse en place (il ajoute et met à jour, il
 * ne supprime jamais).
 */
final class ReferenceAdmin
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    /** @param 'item'|'garment' $kind */
    public function addCategory(string $kind, string $name, ?string $parentId, ?string $warmth = null, ?string $sizeSystemId = null): AbstractCategory
    {
        $name = self::name($name);
        $class = 'garment' === $kind ? GarmentCategory::class : ItemCategory::class;
        $slug = AbstractCategory::slugify($name);
        if (null !== $this->em->getRepository($class)->findOneBy(['slug' => $slug, 'owner' => null])) {
            throw new \DomainException('Une catégorie de ce nom existe déjà.');
        }

        $parent = null;
        if (null !== $parentId && '' !== $parentId) {
            $parent = $this->em->find($class, $parentId);
            if (null === $parent || null !== $parent->getOwner() || null !== $parent->getParent()) {
                throw new \DomainException('Une sous-catégorie se range sous une catégorie principale de l\'application.');
            }
        }

        $category = new $class($name);
        if ($category instanceof GarmentCategory) {
            \assert(null === $parent || $parent instanceof GarmentCategory);
            $category->setParent($parent);
            // Chaleur et échelle de tailles : seulement pour une feuille (les catégories principales n'en ont pas).
            if (null !== $parent) {
                $category->setDefaultWarmth(null === $warmth || '' === $warmth ? null : (Warmth::tryFrom($warmth) ?? throw new \DomainException('Chaleur inconnue.')));
                $category->setSizeSystem(null === $sizeSystemId || '' === $sizeSystemId ? null : ($this->em->find(SizeSystem::class, $sizeSystemId) ?? throw new \DomainException('Échelle de tailles inconnue.')));
            }
        } else {
            \assert(null === $parent || $parent instanceof ItemCategory);
            $category->setParent($parent);
        }
        $this->em->persist($category);
        $this->em->flush();

        return $category;
    }

    public function renameCategory(AbstractCategory $category, string $name): void
    {
        $this->assertSystem($category);
        $category->setName(self::name($name));
        $this->em->flush();
    }

    public function deleteCategory(AbstractCategory $category): void
    {
        $this->assertSystem($category);
        $possessions = $category instanceof GarmentCategory ? Garment::class : Item::class;
        if ($this->em->getRepository($possessions)->count(['category' => $category]) > 0) {
            throw new \DomainException('Des biens sont rangés dans cette catégorie : renomme-la plutôt.');
        }
        $children = $category instanceof GarmentCategory
            ? $this->em->getRepository(GarmentCategory::class)->count(['parent' => $category])
            : $this->em->getRepository(ItemCategory::class)->count(['parent' => $category]);
        if ($children > 0) {
            throw new \DomainException('Cette catégorie a des sous-catégories : supprime-les d\'abord.');
        }
        $this->em->remove($category);
        $this->em->flush();
    }

    public function addBrand(string $name): Brand
    {
        $brand = Brand::reference(self::name($name));
        $existing = $this->em->getRepository(Brand::class)->findOneBy(['slug' => $brand->getSlug()]);
        if (null !== $existing) {
            throw new \DomainException(\sprintf('La marque « %s » existe déjà%s.', $existing->getName(), $existing->isVerified() ? '' : ' (à valider)'));
        }
        $this->em->persist($brand);
        $this->em->flush();

        return $brand;
    }

    public function verifyBrand(Brand $brand): void
    {
        $brand->verify();
        $this->em->flush();
    }

    public function renameBrand(Brand $brand, string $name): void
    {
        $name = self::name($name);
        $other = $this->em->getRepository(Brand::class)->findOneBy(['slug' => Brand::slugify($name)]);
        if (null !== $other && $other !== $brand) {
            throw new \DomainException(\sprintf('« %s » existe déjà : fusionne plutôt les deux marques.', $other->getName()));
        }
        $brand->rename($name);
        $this->em->flush();
    }

    /** Un doublon (« Zara Home » saisi en « zarahome ») : ses vêtements passent sur l'autre marque, puis il disparaît. */
    public function mergeBrand(Brand $duplicate, Brand $into): int
    {
        if ($duplicate === $into) {
            throw new \DomainException('Choisis une autre marque.');
        }

        return $this->em->wrapInTransaction(function () use ($duplicate, $into): int {
            $moved = $this->em->createQueryBuilder()->update(Garment::class, 'g')
                ->set('g.brand', ':into')->where('g.brand = :duplicate')
                ->setParameter('into', $into)->setParameter('duplicate', $duplicate)
                ->getQuery()->execute();
            $this->em->remove($duplicate);

            return (int) $moved;
        });
    }

    public function deleteBrand(Brand $brand): void
    {
        if ($this->em->getRepository(Garment::class)->count(['brand' => $brand]) > 0) {
            throw new \DomainException('Des vêtements portent cette marque : fusionne-la dans une autre plutôt.');
        }
        $this->em->remove($brand);
        $this->em->flush();
    }

    private function assertSystem(AbstractCategory $category): void
    {
        if (null !== $category->getOwner()) {
            throw new \DomainException('Une catégorie créée par un profil reste la sienne.');
        }
    }

    private static function name(string $name): string
    {
        $name = trim(preg_replace('/\s+/', ' ', $name) ?? '');
        if ('' === $name || mb_strlen($name) > 80) {
            throw new \DomainException('Le nom fait de 1 à 80 caractères.');
        }

        return $name;
    }
}
