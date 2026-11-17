<?php

namespace App\Controller\Identity;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Inventory\Scan;
use App\Entity\Loan\Loan;
use App\Entity\Sale\Listing;
use App\Entity\Sale\Order;
use App\Enum\Inventory\ScanStatus;
use App\Enum\Loan\LoanStatus;
use App\Enum\Sale\ListingStatus;
use App\Enum\Sale\OrderStatus;
use App\Security\CurrentProfile;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * « Mon activité » (Profil ▸ Mon activité) : les chiffres du profil actif,
 * et seulement les siens. Écran à part, demandé par l'étudiant le 16/11 :
 * l'accueil reste sans tableau de bord (principes UX, § 7).
 *
 * Des requêtes agrégées (COUNT), jamais une liste chargée pour être comptée.
 */
final class ActivityController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ClockInterface $clock,
    ) {
    }

    #[Route('/api/me/activity', name: 'api_me_activity', methods: ['GET'])]
    public function __invoke(CurrentProfile $current): JsonResponse
    {
        $me = $current->get();
        $today = $this->clock->now()->setTime(0, 0);
        $month = $today->modify('first day of this month');

        $items = $this->possessions(Item::class, $me);
        $garments = $this->possessions(Garment::class, $me);
        $scans = $this->count(Scan::class, 's', ['s.profile = :me'], ['me' => $me]);
        $recognised = $this->count(Scan::class, 's', ['s.profile = :me', 's.status = :ok'], ['me' => $me, 'ok' => ScanStatus::Success]);

        return $this->json([
            'inventory' => [
                'items' => $items,
                'garments' => $garments,
                'addedThisMonth' => $this->possessions(Item::class, $me, $month) + $this->possessions(Garment::class, $me, $month),
            ],
            'loans' => [
                'lent' => $this->count(Loan::class, 'l', ['l.lender = :me', 'l.status = :active'], ['me' => $me, 'active' => LoanStatus::Active]),
                'overdue' => $this->count(Loan::class, 'l', ['l.lender = :me', 'l.status = :active', 'l.dueDate < :today'], ['me' => $me, 'active' => LoanStatus::Active, 'today' => $today]),
                'borrowed' => $this->count(Loan::class, 'l', ['l.borrower = :me', 'l.status = :active'], ['me' => $me, 'active' => LoanStatus::Active]),
                'returned' => $this->count(Loan::class, 'l', ['(l.lender = :me OR l.borrower = :me)', 'l.status = :returned'], ['me' => $me, 'returned' => LoanStatus::Returned]),
            ],
            'sales' => [
                'onSale' => $this->count(Listing::class, 'x', ['x.seller = :me', 'x.status = :published'], ['me' => $me, 'published' => ListingStatus::Published]),
                'sold' => $this->count(Order::class, 'o', ['o.seller = :me', 'o.status = :done'], ['me' => $me, 'done' => OrderStatus::Completed]),
                'bought' => $this->count(Order::class, 'o', ['o.buyer = :me', 'o.status = :done'], ['me' => $me, 'done' => OrderStatus::Completed]),
            ],
            'scans' => [
                'total' => $scans,
                'recognised' => $recognised,
                // Part des scans entièrement reconnus ; null tant qu'il n'y a aucun scan.
                'rate' => 0 === $scans ? null : (int) round(100 * $recognised / $scans),
            ],
        ]);
    }

    /** @param class-string<Item|Garment> $class */
    private function possessions(string $class, Profile $me, ?\DateTimeImmutable $since = null): int
    {
        $where = ['x.owner = :me', 'x.deletedAt IS NULL'];
        $params = ['me' => $me];
        if (null !== $since) {
            $where[] = 'x.createdAt >= :since';
            $params['since'] = $since;
        }

        return $this->count($class, 'x', $where, $params);
    }

    /**
     * @param class-string         $class
     * @param list<string>         $where
     * @param array<string, mixed> $params
     */
    private function count(string $class, string $alias, array $where, array $params): int
    {
        $qb = $this->em->createQueryBuilder()->select("COUNT($alias.id)")->from($class, $alias);
        foreach ($where as $condition) {
            $qb->andWhere($condition);
        }
        foreach ($params as $name => $value) {
            $qb->setParameter($name, $value);
        }

        return (int) $qb->getQuery()->getSingleScalarResult();
    }
}
