<?php

namespace App\Controller\Admin;

use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Reference\AbstractCategory;
use App\Entity\Reference\GarmentCategory;
use App\Entity\Reference\ItemCategory;
use App\Entity\Reference\Style;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Catégories (maquette « Admin — Catégories ») : ce qui organise
 * l'inventaire, avec le nombre de biens rangés sous chaque catégorie de
 * premier niveau (sous-catégories comprises), les styles, et les états d'un
 * objet.
 *
 * En lecture seule : les catégories de l'application viennent des
 * référentiels (app:reference-data:load, src/ReferenceData). Les modifier
 * ici les ferait diverger de leur source ; les catégories d'un profil
 * restent les siennes.
 */
final class CategoryController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    #[Route('/admin/categories', name: 'admin_categories', methods: ['GET'])]
    public function __invoke(): Response
    {
        $styles = $this->em->createQueryBuilder()
            ->select('s AS style, COUNT(g.id) AS n')->from(Style::class, 's')
            ->leftJoin(Garment::class, 'g', 'WITH', 's MEMBER OF g.styles AND g.deletedAt IS NULL')
            ->groupBy('s.id')->orderBy('s.name')
            ->getQuery()->getResult();

        return $this->render('admin/categories/index.html.twig', [
            'items' => $this->roots(ItemCategory::class, Item::class),
            'garments' => $this->roots(GarmentCategory::class, Garment::class),
            'styles' => $styles,
        ]);
    }

    /**
     * Les catégories de l'application de premier niveau, et le nombre de
     * biens rangés sous chacune (sous-catégories comprises).
     *
     * @param class-string<AbstractCategory>    $categoryClass
     * @param class-string<Item>|class-string<Garment> $possessionClass
     *
     * @return list<array{category: AbstractCategory, children: int, possessions: int}>
     */
    private function roots(string $categoryClass, string $possessionClass): array
    {
        /** @var list<AbstractCategory> $all */
        $all = $this->em->getRepository($categoryClass)->findBy(['owner' => null], ['name' => 'ASC']);
        $counts = [];
        foreach ($this->em->createQueryBuilder()
            ->select('IDENTITY(x.category) AS category, COUNT(x.id) AS n')->from($possessionClass, 'x')
            ->where('x.deletedAt IS NULL')->andWhere('x.category IS NOT NULL')->groupBy('x.category')
            ->getQuery()->getArrayResult() as $row) {
            $counts[(string) $row['category']] = (int) $row['n'];
        }

        $roots = [];
        foreach ($all as $category) {
            $root = $category;
            while (null !== $root->getParent()) {
                $root = $root->getParent();
            }
            $key = (string) $root->getId();
            $roots[$key] ??= ['category' => $root, 'children' => 0, 'possessions' => 0];
            if ($root !== $category) {
                ++$roots[$key]['children'];
            }
            $roots[$key]['possessions'] += $counts[(string) $category->getId()] ?? 0;
        }

        // Ordre alphabétique, « Autre » en dernier.
        usort($roots, static fn (array $a, array $b) => ['autre' === $a['category']->getSlug(), $a['category']->getName()] <=> ['autre' === $b['category']->getSlug(), $b['category']->getName()]);

        return $roots;
    }
}
