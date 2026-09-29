<?php

namespace App\Doctrine;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Place\Box;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Place\Storage;
use App\Entity\Reference\GarmentCategory;
use App\Entity\Reference\ItemCategory;
use App\Security\CurrentProfile;
use Doctrine\ORM\QueryBuilder;

/**
 * Les listes (GET /api/items, /api/places…) ne montrent que ce que le
 * profil actif possède, ou ce que possèdent les profils dont il est le
 * tuteur — le même périmètre que OwnershipVoter, appliqué en SQL.
 *
 * Les objets et vêtements supprimés en douceur n'apparaissent pas.
 */
final class OwnedByCurrentProfileExtension implements QueryCollectionExtensionInterface
{
    /** Chemin de la jointure jusqu'au propriétaire, par classe. */
    private const OWNER_PATHS = [
        Item::class => [],
        Garment::class => [],
        Place::class => [],
        Room::class => ['place'],
        Storage::class => ['room', 'place'],
        Box::class => ['room', 'place'],
    ];

    public function __construct(private readonly CurrentProfile $current)
    {
    }

    public function applyToCollection(QueryBuilder $queryBuilder, QueryNameGeneratorInterface $queryNameGenerator, string $resourceClass, ?Operation $operation = null, array $context = []): void
    {
        $alias = $queryBuilder->getRootAliases()[0];

        // Les profils : seulement ceux du compte connecté (le sélecteur de profil).
        if (Profile::class === $resourceClass) {
            $account = $queryNameGenerator->generateParameterName('account');
            $queryBuilder->andWhere("$alias.account = :$account")->setParameter($account, $this->current->account()->getId(), 'uuid');

            return;
        }

        // Les catégories : celles de l'application, plus celles du profil actif.
        if (ItemCategory::class === $resourceClass || GarmentCategory::class === $resourceClass) {
            $me = $queryNameGenerator->generateParameterName('me');
            $queryBuilder->andWhere("$alias.owner IS NULL OR $alias.owner = :$me")->setParameter($me, $this->current->get()->getId(), 'uuid');

            return;
        }

        if (!\array_key_exists($resourceClass, self::OWNER_PATHS)) {
            return;
        }

        $last = $alias;
        foreach (self::OWNER_PATHS[$resourceClass] as $relation) {
            $join = $queryNameGenerator->generateJoinAlias($relation);
            $queryBuilder->join("$last.$relation", $join);
            $last = $join;
        }

        $owner = $queryNameGenerator->generateJoinAlias('owner');
        $me = $queryNameGenerator->generateParameterName('me');
        $queryBuilder
            ->join("$last.owner", $owner)
            ->andWhere("$owner = :$me OR $owner.guardian = :$me")
            ->setParameter($me, $this->current->get()->getId(), 'uuid');

        if (\in_array($resourceClass, [Item::class, Garment::class], true)) {
            $queryBuilder->andWhere("$alias.deletedAt IS NULL");
        }
    }
}
