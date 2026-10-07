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
use App\Entity\Place\PlaceMember;
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
 *
 * Colocation : les logements dont on est membre, et dans ceux-ci les pièces
 * qu'on voit (communes, les siennes, celles où l'on est autorisé), avec
 * leurs rangements et conteneurs.
 */
final class OwnedByCurrentProfileExtension implements QueryCollectionExtensionInterface
{
    /** Chemin de la jointure jusqu'au propriétaire, par classe. */
    private const OWNER_PATHS = [
        Item::class => [],
        Garment::class => [],
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

        // Les logements dont on est membre.
        if (Place::class === $resourceClass) {
            $queryBuilder->andWhere($this->memberOf("$alias.id", $queryBuilder, $queryNameGenerator));

            return;
        }

        // Les pièces qu'on y voit (communes, les siennes, celles où l'on est autorisé), leurs rangements et conteneurs.
        if (\in_array($resourceClass, [Room::class, Storage::class, Box::class], true)) {
            $room = $alias;
            if (Room::class !== $resourceClass) {
                $room = $queryNameGenerator->generateJoinAlias('room');
                $queryBuilder->join("$alias.room", $room);
            }
            $creator = $queryNameGenerator->generateJoinAlias('creator');
            $me = $queryNameGenerator->generateParameterName('me');
            $queryBuilder
                ->join("$room.createdBy", $creator)
                ->andWhere($this->memberOf("IDENTITY($room.place)", $queryBuilder, $queryNameGenerator))
                ->andWhere("$room.closed = false OR $creator = :$me OR $creator.guardian = :$me OR :$me MEMBER OF $room.allowedMembers")
                ->setParameter($me, $this->current->get()->getId(), 'uuid');

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

    /** « $placeId est un logement dont je suis membre (moi ou un enfant dont je suis le tuteur) ». */
    private function memberOf(string $placeId, QueryBuilder $queryBuilder, QueryNameGeneratorInterface $queryNameGenerator): string
    {
        $m = $queryNameGenerator->generateJoinAlias('member');
        $mp = $queryNameGenerator->generateJoinAlias('memberProfile');
        $me = $queryNameGenerator->generateParameterName('me');
        $queryBuilder->setParameter($me, $this->current->get()->getId(), 'uuid');

        return "$placeId IN (SELECT IDENTITY($m.place) FROM ".PlaceMember::class." $m JOIN $m.profile $mp WHERE $mp = :$me OR $mp.guardian = :$me)";
    }
}
