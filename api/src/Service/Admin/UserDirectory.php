<?php

namespace App\Service\Admin;

use App\Entity\Identity\Account;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Sale\Dispute;
use App\Entity\Sale\Order;
use App\Enum\Identity\ProfileType;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;

/**
 * La liste des comptes du back-office (maquette « Admin — Utilisateurs ») :
 * recherche (e-mail, identifiant, nom), filtres, pagination, et ce qu'on
 * affiche de chaque compte. Les compteurs se calculent pour toute la page
 * en une requête chacun, jamais compte par compte.
 */
final class UserDirectory
{
    public const PER_PAGE = 20;

    /** Les filtres de la maquette ; « Signalés » attend l'entité Report (V2). */
    public const FILTERS = ['all', 'active', 'suspended', 'children'];

    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    /**
     * @return array{rows: list<array{account: Account, profile: Profile|null, profiles: int, children: int, possessions: int, suspended: bool}>, total: int}
     */
    public function search(string $filter, string $query, int $page): array
    {
        $qb = $this->base($filter, $query);
        $total = (int) (clone $qb)->select('COUNT(a.id)')->getQuery()->getSingleScalarResult();

        /** @var list<Account> $accounts */
        $accounts = $qb->select('a')
            ->orderBy('a.createdAt', 'DESC')
            ->setFirstResult(($page - 1) * self::PER_PAGE)->setMaxResults(self::PER_PAGE)
            ->getQuery()->getResult();

        $ids = array_map(static fn (Account $a) => $a->getId()->toRfc4122(), $accounts);
        $possessions = $this->possessionsPerAccount($ids);
        $rows = [];
        foreach ($accounts as $account) {
            $profiles = $account->getProfiles()->toArray();
            $rows[] = [
                'account' => $account,
                'profile' => self::mainProfile($account),
                'profiles' => \count($profiles),
                'children' => \count(array_filter($profiles, static fn (Profile $p) => ProfileType::Child === $p->getType())),
                'possessions' => $possessions[$account->getId()->toRfc4122()] ?? 0,
                'suspended' => [] !== array_filter($profiles, static fn (Profile $p) => null !== $p->getSuspendedAt()),
            ];
        }

        return ['rows' => $rows, 'total' => $total];
    }

    /** @return array{all: int, children: int, suspended: int} */
    public function counts(): array
    {
        $count = fn (string $filter) => (int) $this->base($filter, '')->select('COUNT(a.id)')->getQuery()->getSingleScalarResult();

        return ['all' => $count('all'), 'children' => $count('children'), 'suspended' => $count('suspended')];
    }

    /**
     * La fiche d'un compte : ses profils (et ce que chacun possède) et son
     * activité.
     *
     * @return array{profile: Profile|null, profiles: list<array{profile: Profile, possessions: int}>, possessions: int, sales: int, purchases: int, disputes: int}
     */
    public function details(Account $account): array
    {
        $profiles = $account->getProfiles()->toArray();
        usort($profiles, static fn (Profile $a, Profile $b) => [!$a->isDefault(), $a->getType()->value, $a->getDisplayName()] <=> [!$b->isDefault(), $b->getType()->value, $b->getDisplayName()]);
        $perProfile = $this->possessionsPerProfile($profiles);
        $orders = fn (string $side) => (int) $this->em->createQueryBuilder()
            ->select('COUNT(o.id)')->from(Order::class, 'o')
            ->where(\sprintf('o.%s IN (:profiles)', $side))->setParameter('profiles', $profiles)
            ->getQuery()->getSingleScalarResult();

        return [
            'profile' => self::mainProfile($account),
            'profiles' => array_map(static fn (Profile $p) => ['profile' => $p, 'possessions' => $perProfile[$p->getId()->toRfc4122()] ?? 0], $profiles),
            'possessions' => array_sum($perProfile),
            'sales' => [] === $profiles ? 0 : $orders('seller'),
            'purchases' => [] === $profiles ? 0 : $orders('buyer'),
            'disputes' => [] === $profiles ? 0 : (int) $this->em->createQueryBuilder()
                ->select('COUNT(d.id)')->from(Dispute::class, 'd')->join('d.order', 'o')
                ->where('o.buyer IN (:profiles) OR o.seller IN (:profiles)')->setParameter('profiles', $profiles)
                ->getQuery()->getSingleScalarResult(),
        ];
    }

    /** Le profil par défaut, sinon le premier : c'est le nom affiché du compte. */
    public static function mainProfile(Account $account): ?Profile
    {
        $profiles = $account->getProfiles()->toArray();
        foreach ($profiles as $profile) {
            if ($profile->isDefault()) {
                return $profile;
            }
        }

        return $profiles[0] ?? null;
    }

    private function base(string $filter, string $query): QueryBuilder
    {
        // Pas de jointure sur les profils : un compte en a plusieurs, il
        // apparaîtrait plusieurs fois (et PostgreSQL ne dédoublonne pas une
        // ligne qui porte une colonne json, les rôles). Des EXISTS à la place.
        $qb = $this->em->createQueryBuilder()
            ->from(Account::class, 'a')
            ->where('a.id != :ghost')->setParameter('ghost', Account::GHOST_ID);
        if ('' !== trim($query)) {
            $qb->andWhere(\sprintf('LOWER(a.email) LIKE :q OR EXISTS (SELECT 1 FROM %s sp WHERE sp.account = a AND (LOWER(sp.username) LIKE :q OR LOWER(sp.displayName) LIKE :q))', Profile::class))
                ->setParameter('q', '%'.mb_strtolower(trim($query)).'%');
        }
        $suspended = \sprintf('EXISTS (SELECT 1 FROM %s s WHERE s.account = a AND s.suspendedAt IS NOT NULL)', Profile::class);
        match ($filter) {
            'active' => $qb->andWhere('NOT '.$suspended),
            'suspended' => $qb->andWhere($suspended),
            'children' => $qb->andWhere(\sprintf('EXISTS (SELECT 1 FROM %s c WHERE c.account = a AND c.type = :child)', Profile::class))->setParameter('child', ProfileType::Child),
            default => null,
        };

        return $qb;
    }

    /**
     * Objets et vêtements (non supprimés) par compte.
     *
     * @param list<string> $accountIds
     *
     * @return array<string, int>
     */
    private function possessionsPerAccount(array $accountIds): array
    {
        if ([] === $accountIds) {
            return [];
        }
        $counts = [];
        foreach ([Item::class, Garment::class] as $class) {
            $rows = $this->em->createQueryBuilder()
                ->select('IDENTITY(pr.account) AS account, COUNT(x.id) AS n')->from($class, 'x')->join('x.owner', 'pr')
                ->where('pr.account IN (:ids)')->andWhere('x.deletedAt IS NULL')
                ->setParameter('ids', $accountIds)->groupBy('pr.account')
                ->getQuery()->getArrayResult();
            foreach ($rows as $row) {
                $counts[(string) $row['account']] = ($counts[(string) $row['account']] ?? 0) + (int) $row['n'];
            }
        }

        return $counts;
    }

    /**
     * @param list<Profile> $profiles
     *
     * @return array<string, int>
     */
    private function possessionsPerProfile(array $profiles): array
    {
        if ([] === $profiles) {
            return [];
        }
        $counts = [];
        foreach ([Item::class, Garment::class] as $class) {
            $rows = $this->em->createQueryBuilder()
                ->select('IDENTITY(x.owner) AS owner, COUNT(x.id) AS n')->from($class, 'x')
                ->where('x.owner IN (:profiles)')->andWhere('x.deletedAt IS NULL')
                ->setParameter('profiles', $profiles)->groupBy('x.owner')
                ->getQuery()->getArrayResult();
            foreach ($rows as $row) {
                $counts[(string) $row['owner']] = ($counts[(string) $row['owner']] ?? 0) + (int) $row['n'];
            }
        }

        return $counts;
    }
}
