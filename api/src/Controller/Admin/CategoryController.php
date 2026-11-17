<?php

namespace App\Controller\Admin;

use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Reference\AbstractCategory;
use App\Entity\Reference\Brand;
use App\Entity\Reference\GarmentCategory;
use App\Entity\Reference\ItemCategory;
use App\Entity\Reference\SizeSystem;
use App\Entity\Reference\Style;
use App\Service\Admin\ReferenceAdmin;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Catégories et marques (maquette « Admin — Catégories ») : deux onglets.
 *
 *  - Catégories : celles de l'application (objets, vêtements), chacune avec
 *    ses sous-catégories et le nombre de biens rangés dessous, puis les
 *    styles et les états d'un objet ;
 *  - Marques : à valider (proposées par des utilisateurs) ou toutes, avec
 *    le nombre de vêtements qui les portent.
 *
 * Tout administrateur consulte ; seul le super administrateur
 * (ROLE_SUPER_ADMIN) ajoute, renomme, valide, fusionne ou supprime
 * (ReferenceAdmin). Les gestes sont des POST avec jeton CSRF.
 */
#[Route('/admin/categories')]
final class CategoryController extends AbstractController
{
    private const BRANDS_PER_PAGE = 30;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ReferenceAdmin $admin,
    ) {
    }

    #[Route('', name: 'admin_categories', methods: ['GET'])]
    public function index(Request $request): Response
    {
        if ('brands' === $request->query->get('tab')) {
            return $this->brands($request);
        }
        $styles = $this->em->createQueryBuilder()
            ->select('s AS style, COUNT(g.id) AS n')->from(Style::class, 's')
            ->leftJoin(Garment::class, 'g', 'WITH', 's MEMBER OF g.styles AND g.deletedAt IS NULL')
            ->groupBy('s.id')->orderBy('s.name')
            ->getQuery()->getResult();

        return $this->render('admin/categories/index.html.twig', [
            'tab' => 'categories',
            'items' => $this->roots(ItemCategory::class, Item::class),
            'garments' => $this->roots(GarmentCategory::class, Garment::class),
            'styles' => $styles,
            'sizeSystems' => $this->em->getRepository(SizeSystem::class)->findBy([], ['name' => 'ASC']),
            'pendingBrands' => $this->em->getRepository(Brand::class)->count(['isVerified' => false]),
        ]);
    }

    private function brands(Request $request): Response
    {
        $filter = 'all' === $request->query->get('filter') ? 'all' : 'pending';
        $query = trim((string) $request->query->get('q', ''));
        $page = max(1, $request->query->getInt('page', 1));

        $qb = $this->em->createQueryBuilder()->from(Brand::class, 'b');
        if ('pending' === $filter) {
            $qb->andWhere('b.isVerified = false');
        }
        if ('' !== $query) {
            $qb->andWhere('b.slug LIKE :q')->setParameter('q', '%'.Brand::slugify($query).'%');
        }
        $total = (int) (clone $qb)->select('COUNT(b.id)')->getQuery()->getSingleScalarResult();
        /** @var list<Brand> $brands */
        $brands = $qb->select('b')->orderBy('b.isVerified', 'ASC')->addOrderBy('b.name', 'ASC')
            ->setFirstResult(($page - 1) * self::BRANDS_PER_PAGE)->setMaxResults(self::BRANDS_PER_PAGE)
            ->getQuery()->getResult();

        $counts = [];
        if ([] !== $brands) {
            foreach ($this->em->createQueryBuilder()->select('IDENTITY(g.brand) AS brand, COUNT(g.id) AS n')->from(Garment::class, 'g')
                ->where('g.brand IN (:brands)')->andWhere('g.deletedAt IS NULL')->setParameter('brands', $brands)
                ->groupBy('g.brand')->getQuery()->getArrayResult() as $row) {
                $counts[(string) $row['brand']] = (int) $row['n'];
            }
        }

        return $this->render('admin/categories/brands.html.twig', [
            'tab' => 'brands',
            'filter' => $filter,
            'query' => $query,
            'page' => $page,
            'perPage' => self::BRANDS_PER_PAGE,
            'total' => $total,
            'rows' => array_map(static fn (Brand $b) => ['brand' => $b, 'garments' => $counts[(string) $b->getId()] ?? 0], $brands),
            'pendingBrands' => $this->em->getRepository(Brand::class)->count(['isVerified' => false]),
            // Pour « Fusionner dans… » : les marques vérifiées.
            'verified' => $this->em->getRepository(Brand::class)->findBy(['isVerified' => true], ['name' => 'ASC']),
        ]);
    }

    // --- Catégories (super administrateur) -----------------------------------

    #[Route('/ajouter', name: 'admin_category_add', methods: ['POST'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function addCategory(Request $request): Response
    {
        if ($this->checked($request, 'category-add')) {
            $kind = 'garment' === $request->request->get('kind') ? 'garment' : 'item';
            $optional = static fn (mixed $v): ?string => \is_string($v) && '' !== $v ? $v : null;
            $this->attempt(fn () => $this->admin->addCategory(
                $kind,
                (string) $request->request->get('name'),
                $optional($request->request->get('parent')),
                $optional($request->request->get('warmth')),
                $optional($request->request->get('sizeSystem')),
            ), 'Catégorie ajoutée.');
        }

        return $this->redirectToRoute('admin_categories');
    }

    #[Route('/{kind}/{id}/renommer', name: 'admin_category_rename', methods: ['POST'], requirements: ['kind' => 'item|garment', 'id' => Requirement::UUID])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function renameCategory(string $kind, string $id, Request $request): Response
    {
        $category = $this->category($kind, $id);
        if ($this->checked($request, 'category-'.$id)) {
            $this->attempt(fn () => $this->admin->renameCategory($category, (string) $request->request->get('name')), 'Catégorie renommée.');
        }

        return $this->redirectToRoute('admin_categories');
    }

    #[Route('/{kind}/{id}/supprimer', name: 'admin_category_delete', methods: ['POST'], requirements: ['kind' => 'item|garment', 'id' => Requirement::UUID])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function deleteCategory(string $kind, string $id, Request $request): Response
    {
        $category = $this->category($kind, $id);
        if ($this->checked($request, 'category-'.$id)) {
            $this->attempt(fn () => $this->admin->deleteCategory($category), 'Catégorie supprimée.');
        }

        return $this->redirectToRoute('admin_categories');
    }

    // --- Marques (super administrateur) --------------------------------------

    #[Route('/marques/ajouter', name: 'admin_brand_add', methods: ['POST'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function addBrand(Request $request): Response
    {
        if ($this->checked($request, 'brand-add')) {
            $this->attempt(fn () => $this->admin->addBrand((string) $request->request->get('name')), 'Marque ajoutée.');
        }

        return $this->redirectToRoute('admin_categories', ['tab' => 'brands', 'filter' => 'all']);
    }

    #[Route('/marques/{id}/{action}', name: 'admin_brand_action', methods: ['POST'], requirements: ['id' => Requirement::UUID, 'action' => 'valider|renommer|fusionner|supprimer'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function brandAction(string $id, string $action, Request $request): Response
    {
        $brand = $this->em->find(Brand::class, $id) ?? throw $this->createNotFoundException('Marque introuvable.');
        if ($this->checked($request, 'brand-'.$id)) {
            match ($action) {
                'valider' => $this->attempt(fn () => $this->admin->verifyBrand($brand), 'Marque validée : elle rejoint la liste de tous.'),
                'renommer' => $this->attempt(fn () => $this->admin->renameBrand($brand, (string) $request->request->get('name')), 'Marque renommée.'),
                'fusionner' => $this->attempt(function () use ($brand, $request): void {
                    $into = $this->em->find(Brand::class, (string) $request->request->get('into')) ?? throw new \DomainException('Choisis la marque qui la remplace.');
                    $this->admin->mergeBrand($brand, $into);
                }, 'Marques fusionnées : les vêtements portent maintenant la marque choisie.'),
                default => $this->attempt(fn () => $this->admin->deleteBrand($brand), 'Marque supprimée.'),
            };
        }

        return $this->redirectToRoute('admin_categories', ['tab' => 'brands', 'filter' => 'all' === $request->request->get('filter') ? 'all' : 'pending']);
    }

    private function attempt(callable $action, string $success): void
    {
        try {
            $action();
            $this->addFlash('success', $success);
        } catch (\DomainException $e) {
            $this->addFlash('error', $e->getMessage());
        }
    }

    private function category(string $kind, string $id): AbstractCategory
    {
        return $this->em->find('garment' === $kind ? GarmentCategory::class : ItemCategory::class, $id) ?? throw $this->createNotFoundException('Catégorie introuvable.');
    }

    private function checked(Request $request, string $tokenId): bool
    {
        if ($this->isCsrfTokenValid($tokenId, (string) $request->request->get('_token'))) {
            return true;
        }
        $this->addFlash('error', 'La page a expiré : recharge-la et réessaie.');

        return false;
    }

    /**
     * Les catégories de l'application de premier niveau, leurs
     * sous-catégories, et le nombre de biens rangés sous chacune.
     *
     * @param class-string<AbstractCategory>           $categoryClass
     * @param class-string<Item>|class-string<Garment> $possessionClass
     *
     * @return list<array{category: AbstractCategory, children: list<array{category: AbstractCategory, possessions: int}>, possessions: int}>
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
            $roots[$key] ??= ['category' => $root, 'children' => [], 'possessions' => 0];
            $n = $counts[(string) $category->getId()] ?? 0;
            if ($root !== $category) {
                $roots[$key]['children'][] = ['category' => $category, 'possessions' => $n];
            }
            $roots[$key]['possessions'] += $n;
        }

        // Ordre alphabétique, « Autre » en dernier.
        usort($roots, static fn (array $a, array $b) => ['autre' === $a['category']->getSlug(), $a['category']->getName()] <=> ['autre' === $b['category']->getSlug(), $b['category']->getName()]);

        return $roots;
    }
}
