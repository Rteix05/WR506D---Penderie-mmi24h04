<?php

namespace App\Service\Sharing;

use App\Entity\Dressing\Outfit;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Place\Box;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Sharing\BoxShare;
use App\Entity\Sharing\Collection;
use App\Entity\Sharing\CollectionShare;
use App\Entity\Sharing\GarmentShare;
use App\Entity\Sharing\ItemShare;
use App\Entity\Sharing\OutfitShare;
use App\Entity\Sharing\PlaceShare;
use App\Entity\Sharing\RoomShare;
use App\Entity\Sharing\Share;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * La correspondance entre un type de cible (« ITEM », « ROOM »…), son
 * entité et son sous-type de partage. Un seul endroit, pour les routes de
 * partage et de contribution.
 */
final class ShareTargets
{
    /** @var array<string, array{0: class-string, 1: class-string<Share>, 2: string}> */
    public const TYPES = [
        'ITEM' => [Item::class, ItemShare::class, 'getItem'],
        'GARMENT' => [Garment::class, GarmentShare::class, 'getGarment'],
        'ROOM' => [Room::class, RoomShare::class, 'getRoom'],
        'BOX' => [Box::class, BoxShare::class, 'getBox'],
        'PLACE' => [Place::class, PlaceShare::class, 'getPlace'],
        'OUTFIT' => [Outfit::class, OutfitShare::class, 'getOutfit'],
        'COLLECTION' => [Collection::class, CollectionShare::class, 'getCollection'],
    ];

    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public function find(string $type, string $id): object
    {
        $class = self::TYPES[$type][0] ?? throw new \LogicException(\sprintf('Type de cible inconnu : « %s ».', $type));

        return $this->em->find($class, $id) ?? throw new NotFoundHttpException('Cible introuvable.');
    }

    /** @return class-string<Share> */
    public function shareClass(string $type): string
    {
        return self::TYPES[$type][1] ?? throw new \LogicException(\sprintf('Type de cible inconnu : « %s ».', $type));
    }

    public function targetOf(Share $share): object
    {
        foreach (self::TYPES as [, $shareClass, $getter]) {
            if ($share instanceof $shareClass) {
                return $share->{$getter}();
            }
        }
        throw new \LogicException('Partage sans cible connue.');
    }

    public function typeOf(Share $share): string
    {
        foreach (self::TYPES as $type => [, $shareClass]) {
            if ($share instanceof $shareClass) {
                return $type;
            }
        }
        throw new \LogicException('Partage sans cible connue.');
    }
}
