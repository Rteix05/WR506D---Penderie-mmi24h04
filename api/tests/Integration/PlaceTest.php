<?php

namespace App\Tests\Integration;

use App\Entity\Place\Box;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Place\Storage;
use App\Enum\Place\BoxType;
use App\Enum\Place\RoomType;
use App\Enum\Place\StorageType;

final class PlaceTest extends DatabaseTestCase
{
    public function testMockupCascadeWithAShelfInsideAWardrobe(): void
    {
        $rafael = $this->profile('rafael');
        $maison = (new Place($rafael, 'Maison'))->setIsPrimary(true);
        $chambre = new Room($maison, 'Chambre', RoomType::Bedroom);
        $armoire = new Storage($chambre, 'Armoire', StorageType::Wardrobe);
        $etagere = new Box($chambre, 'Étagère 2', BoxType::Shelf, $armoire);
        $this->persist($maison, $chambre, $armoire, $etagere);

        $this->assertValid($etagere);
        self::assertTrue($maison->getRooms()->contains($chambre));
        self::assertTrue($chambre->getStorages()->contains($armoire));
        self::assertTrue($armoire->getBoxes()->contains($etagere));
    }

    public function testBoxOnAStorageOfAnotherRoomIsInvalid(): void
    {
        $maison = new Place($this->profile('rafael'), 'Maison');
        $garage = new Room($maison, 'Garage');
        $chambre = new Room($maison, 'Chambre');

        $this->assertInvalid(new Box($chambre, 'Bac', BoxType::Bin, new Storage($garage, 'Étagère')), 'autre pièce');
    }

    public function testOnlyACartonCanBeSealed(): void
    {
        $room = new Room(new Place($this->profile('rafael'), 'Maison'), 'Garage');
        $carton = (new Box($room, 'Carton'))->seal();
        self::assertTrue($carton->isSealed());

        $carton->setType(BoxType::Bin);
        self::assertFalse($carton->isSealed(), 'changer de type descelle');

        $this->expectException(\LogicException::class);
        (new Box($room, 'Étagère', BoxType::Shelf))->seal();
    }

    public function testMovingAStorageMovesItsBoxesInMemoryAndInDatabase(): void
    {
        $maison = new Place($this->profile('rafael'), 'Maison');
        $garage = new Room($maison, 'Garage');
        $chambre = new Room($maison, 'Chambre');
        $etagere = new Storage($garage, 'Étagère');
        $carton = new Box($garage, 'Carton', BoxType::Carton, $etagere);
        $this->persist($maison, $garage, $chambre, $etagere, $carton);

        $etagere->moveTo($chambre);
        $this->em->flush();

        self::assertSame($chambre, $carton->getRoom());
        self::assertFalse($garage->getBoxes()->contains($carton));
        self::assertTrue($chambre->getBoxes()->contains($carton));
        self::assertSame($chambre->getId()->toRfc4122(), $this->fetchOne("SELECT room_id FROM box WHERE id = '{$carton->getId()}'"));
    }

    public function testDatabaseGuardsPlaces(): void
    {
        $rafael = $this->profile('rafael');
        $maison = (new Place($rafael, 'Maison'))->setIsPrimary(true);
        $room = new Room($maison, 'Garage');
        $etagere = new Box($room, 'Étagère', BoxType::Shelf);
        $this->persist($maison, $room, $etagere);

        $this->assertDbRejects("INSERT INTO place (id, owner_id, name, type, is_primary, created_at, updated_at) VALUES ('01900000-0000-7000-8000-0000000000c1', '{$rafael->getId()}', 'Autre', 'HOUSE', true, now(), now())", 'uniq_place_primary_per_owner');
        $this->assertDbRejects("UPDATE room SET type = 'DUNGEON'", 'chk_room_type');
        $this->assertDbRejects("UPDATE box SET is_sealed = true WHERE id = '{$etagere->getId()}'", 'chk_box_sealed_only_carton');
        $this->assertDbRejects('UPDATE room SET position = -1', 'chk_room_position');
        $this->assertDbRejects("DELETE FROM profile WHERE id = '{$rafael->getId()}'", 'foreign key');
    }

    public function testBoxSurvivesItsStorageAndPlaceDeletionCascades(): void
    {
        $maison = new Place($this->profile('rafael'), 'Maison');
        $room = new Room($maison, 'Chambre');
        $armoire = new Storage($room, 'Armoire');
        $bac = new Box($room, 'Bac', BoxType::Bin, $armoire);
        $this->persist($maison, $room, $armoire, $bac);

        $this->conn->executeStatement("DELETE FROM storage WHERE id = '{$armoire->getId()}'");
        self::assertNull($this->fetchOne("SELECT storage_id FROM box WHERE id = '{$bac->getId()}'"), 'le conteneur reste dans la pièce');

        $this->conn->executeStatement("DELETE FROM place WHERE id = '{$maison->getId()}'");
        self::assertSame(0, (int) $this->fetchOne("SELECT count(*) FROM room WHERE place_id = '{$maison->getId()}'"));
        self::assertSame(0, (int) $this->fetchOne("SELECT count(*) FROM box WHERE id = '{$bac->getId()}'"));
    }
}
