<?php

namespace App\DataFixtures;

use App\Entity\Identity\Profile;
use App\Entity\Place\Box;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Place\Storage;
use App\Enum\Place\PlaceType;
use App\Enum\Place\RoomType;
use App\Enum\Place\StorageType;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

/**
 * Logements de démonstration : toute la cascade Place ▸ Room ▸ Storage ▸ Box.
 *
 * Camille : un appartement (chambre avec armoire et commode, entrée, cave
 * avec un carton) et un box de stockage vide (pour tester la suppression
 * d'un emplacement vide). Thomas : une maison, pour son dressing.
 *
 * Références : room-camille-chambre, storage-camille-armoire,
 * storage-camille-commode, room-camille-entree, box-camille-hiver,
 * room-thomas-chambre.
 */
final class PlaceFixtures extends Fixture implements DependentFixtureInterface
{
    public function getDependencies(): array
    {
        return [AccountFixtures::class];
    }

    public function load(ObjectManager $manager): void
    {
        $camille = $this->getReference('profile-camille', Profile::class);
        $thomas = $this->getReference('profile-thomas', Profile::class);

        $appartement = $this->place($manager, $camille, 'Appartement Lyon', PlaceType::Apartment);
        $chambre = $this->room($manager, $appartement, 'Chambre', RoomType::Bedroom, 0);
        $entree = $this->room($manager, $appartement, 'Entrée', RoomType::Entrance, 1);
        $cave = $this->room($manager, $appartement, 'Cave', RoomType::Cellar, 2);

        $armoire = $this->storage($manager, $chambre, 'Armoire', StorageType::Wardrobe);
        $commode = $this->storage($manager, $chambre, 'Commode', StorageType::Dresser);
        $hiver = new Box($cave, 'Vêtements d\'hiver');
        $manager->persist($hiver);

        $boxStockage = $this->place($manager, $camille, 'Box de stockage', PlaceType::StorageUnit);
        $this->room($manager, $boxStockage, 'Box n° 12', RoomType::Other, 0);

        $maison = $this->place($manager, $thomas, 'Maison Villeurbanne', PlaceType::House);
        $chambreThomas = $this->room($manager, $maison, 'Chambre', RoomType::Bedroom, 0);

        $this->addReference('room-camille-chambre', $chambre);
        $this->addReference('room-camille-entree', $entree);
        $this->addReference('storage-camille-armoire', $armoire);
        $this->addReference('storage-camille-commode', $commode);
        $this->addReference('box-camille-hiver', $hiver);
        $this->addReference('room-thomas-chambre', $chambreThomas);

        $manager->flush();
    }

    private function place(ObjectManager $manager, Profile $owner, string $name, PlaceType $type): Place
    {
        $place = new Place($owner, $name, $type);
        $manager->persist($place);

        return $place;
    }

    private function room(ObjectManager $manager, Place $place, string $name, RoomType $type, int $position): Room
    {
        $room = (new Room($place, $name, $type, $place->getOwner()))->setPosition($position);
        $manager->persist($room);

        return $room;
    }

    private function storage(ObjectManager $manager, Room $room, string $name, StorageType $type): Storage
    {
        $storage = new Storage($room, $name, $type);
        $manager->persist($storage);

        return $storage;
    }
}
