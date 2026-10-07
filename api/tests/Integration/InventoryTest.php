<?php

namespace App\Tests\Integration;

use App\Entity\Inventory\Garment;
use App\Entity\Inventory\GarmentMedia;
use App\Entity\Inventory\Item;
use App\Entity\Inventory\ItemMedia;
use App\Entity\Inventory\LocationHistory;
use App\Entity\Inventory\Scan;
use App\Entity\Media\Media;
use App\Entity\Place\Box;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Place\Storage;
use App\Entity\Reference\SizeValue;
use App\Enum\Inventory\MoveReason;
use App\Enum\Inventory\ScanKind;
use App\Enum\Inventory\ScanStatus;
use App\Enum\Place\BoxType;
use App\Enum\Reference\Warmth;
use App\Service\Inventory\LocationMover;

final class InventoryTest extends DatabaseTestCase
{
    private function sizeValue(string $code, string $label): SizeValue
    {
        return $this->em->find(SizeValue::class, $this->fetchOne("SELECT v.id FROM size_value v JOIN size_system s ON s.id = v.size_system_id WHERE s.code = '$code' AND v.label = '$label'"));
    }

    public function testPlacingInABoxMeansBeingOnItsStorage(): void
    {
        $rafael = $this->profile('rafael');
        $maison = new Place($rafael, 'Maison');
        $garage = new Room($maison, 'Garage');
        $chambre = new Room($maison, 'Chambre');
        $etagere = new Storage($garage, 'Étagère');
        $carton = new Box($garage, 'Carton', BoxType::Carton, $etagere);

        $perceuse = (new Item($rafael, 'Perceuse', $chambre))->placeAt($chambre, null, $carton);
        self::assertSame($garage, $perceuse->getRoom());
        self::assertSame($etagere, $perceuse->getStorage());
        $this->assertValid($perceuse);

        $this->assertInvalid((new Item($rafael, 'Mal rangé', $chambre))->placeAt($chambre, $etagere), 'autre pièce');
    }

    public function testGarmentSizeBelongsToTheCategoryScale(): void
    {
        $rafael = $this->profile('rafael');
        $room = $this->room($rafael);
        $jean = new Garment($rafael, 'Jean 501', $room, $this->garmentCategory('jeans'));

        $this->assertValid($jean->setSize($this->sizeValue('WAIST_LENGTH', 'W32 L34')));
        self::assertSame('W32 L34', $jean->getDisplayedSize());
        $this->assertInvalid($jean->setSize($this->sizeValue('ALPHA', 'M')), 'échelle de la catégorie');
        $this->assertInvalid($jean->setSizeLabel('32/34'), 'Choisis une taille');
        self::assertNull($jean->getSize(), 'le texte libre efface la graduation');

        $this->assertValid((new Garment($rafael, 'Chaussettes', $room, $this->garmentCategory('chaussettes')))->setSizeLabel('39-42'));
    }

    public function testWarmthIsInheritedFromTheCategory(): void
    {
        $rafael = $this->profile('rafael');
        $jean = new Garment($rafael, 'Jean', $this->room($rafael), $this->garmentCategory('jeans'));

        self::assertSame(Warmth::Mid, $jean->getEffectiveWarmth());
        self::assertSame(Warmth::Warm, $jean->setWarmth(Warmth::Warm)->getEffectiveWarmth());
    }

    public function testMovingABoxMovesItsContentAndLogsTheLeftLocation(): void
    {
        $rafael = $this->profile('rafael');
        $maison = new Place($rafael, 'Maison');
        $garage = new Room($maison, 'Garage');
        $cave = new Room($maison, 'Cave');
        $etagere = new Storage($garage, 'Étagère');
        $carton = new Box($garage, 'Carton', BoxType::Carton, $etagere);
        $perceuse = (new Item($rafael, 'Perceuse', $garage))->placeAt($garage, null, $carton);
        $tournevis = (new Item($rafael, 'Tournevis', $garage))->placeAt($garage, null, $carton);
        $this->persist($maison, $garage, $cave, $etagere, $carton, $perceuse, $tournevis);
        $mover = new LocationMover($this->em);

        $mover->move($perceuse, $garage, $etagere, $carton, $rafael);
        self::assertSame(0, (int) $this->fetchOne('SELECT count(*) FROM location_history'), 'aucune trace sans déplacement');

        $mover->moveBox($carton, $cave, null, $rafael);
        self::assertSame($cave, $perceuse->getRoom());
        self::assertNull($perceuse->getStorage());
        $history = $this->conn->fetchAllAssociative("SELECT room_id, storage_id, reason FROM location_history WHERE item_id = '{$perceuse->getId()}'");
        self::assertCount(1, $history);
        self::assertSame($garage->getId()->toRfc4122(), $history[0]['room_id'], 'l\'historique garde l\'emplacement QUITTÉ');
        self::assertSame($etagere->getId()->toRfc4122(), $history[0]['storage_id']);
        self::assertSame('BOX_MOVED', $history[0]['reason']);
        self::assertSame(2, (int) $this->fetchOne("SELECT count(*) FROM location_history WHERE reason = 'BOX_MOVED'"));
    }

    public function testMovingAStorageMovesWhatItHolds(): void
    {
        $rafael = $this->profile('rafael');
        $maison = new Place($rafael, 'Maison');
        $chambre = new Room($maison, 'Chambre');
        $cave = new Room($maison, 'Cave');
        $armoire = new Storage($chambre, 'Armoire');
        $jean = (new Garment($rafael, 'Jean', $chambre, $this->garmentCategory('jeans')))->placeAt($chambre, $armoire);
        $this->persist($maison, $chambre, $cave, $armoire, $jean);
        $mover = new LocationMover($this->em);

        $mover->moveStorage($armoire, $cave, $rafael);
        self::assertSame($cave, $jean->getRoom());
        self::assertSame($armoire, $jean->getStorage());

        $mover->move($jean, $chambre, null, null, $rafael);
        $last = $this->em->getRepository(LocationHistory::class)->findOneBy(['garment' => $jean], ['movedAt' => 'DESC', 'id' => 'DESC']);
        self::assertSame(MoveReason::ManualMove, $last->getReason());
    }

    public function testFuzzyAndFullTextSearch(): void
    {
        $rafael = $this->profile('rafael');
        $this->persist((new Item($rafael, 'Perceuse Bosch', $this->room($rafael)))->setDescription('Perceuse à percussion sans fil'));

        self::assertContains('Perceuse Bosch', $this->conn->fetchFirstColumn("SELECT name FROM item WHERE penderie_unaccent(lower(name)) % penderie_unaccent(lower('perseuse bosh'))"));
        self::assertContains('Perceuse Bosch', $this->conn->fetchFirstColumn("SELECT name FROM item WHERE to_tsvector('french', penderie_unaccent(name || ' ' || coalesce(description, ''))) @@ plainto_tsquery('french', penderie_unaccent('percussion'))"));
    }

    public function testGalleryAndScan(): void
    {
        $rafael = $this->profile('rafael');
        $room = $this->room($rafael);
        $perceuse = new Item($rafael, 'Perceuse', $room);
        $veste = new Garment($rafael, 'Veste', $room, $this->garmentCategory('vestes'));
        $photo1 = new Media($rafael, 'items/p1.jpg', 'image/jpeg', 10);
        $photo2 = new Media($rafael, 'items/p2.jpg', 'image/jpeg', 10);
        $this->persist($perceuse, $veste, $photo1, $photo2, new ItemMedia($perceuse, $photo1, 0, true), new ItemMedia($perceuse, $photo2, 1), new GarmentMedia($veste, $photo2, 0, true));

        $this->assertDbRejects("UPDATE item_media SET is_primary = true WHERE media_id = '{$photo2->getId()}'", 'uniq_item_media_primary');
        $this->assertDbRejects("DELETE FROM media WHERE id = '{$photo1->getId()}'", 'foreign key');

        $scan = (new Scan($rafael, ScanKind::Barcode, ScanStatus::Success, '3165140581080'))->resultedIn($perceuse);
        $failed = new Scan($rafael, ScanKind::LabelOcr, ScanStatus::Failed);
        $this->persist($scan, $failed);
        $this->expectException(\LogicException::class);
        $failed->resultedIn($veste);
    }

    public function testDatabaseGuardsInventory(): void
    {
        $rafael = $this->profile('rafael');
        $room = $this->room($rafael);
        $item = (new Item($rafael, 'Perceuse', $room))->markScanned(['ean' => '1']);
        $jean = (new Garment($rafael, 'Jean', $room, $this->garmentCategory('jeans')))->setSize($this->sizeValue('WAIST_LENGTH', 'W32 L34'))->addColor($this->color('Bleu'));
        $this->persist($item, $jean);

        $this->assertDbRejects("UPDATE item SET availability = 'BROKEN'", 'chk_item_availability');
        $this->assertDbRejects("UPDATE item SET source = 'MANUAL'", 'chk_item_scan_data');
        $this->assertDbRejects('UPDATE item SET estimated_value = -1', 'chk_item_value');
        $this->assertDbRejects("UPDATE garment SET size_label = 'M'", 'chk_garment_one_size');
        $this->assertDbRejects("INSERT INTO location_history (id, room_id, moved_by_id, reason, moved_at) VALUES ('01900000-0000-7000-8000-0000000000e1', '{$room->getId()}', '{$rafael->getId()}', 'INITIAL', now())", 'chk_location_history_target');
        $this->assertDbRejects("DELETE FROM room WHERE id = '{$room->getId()}'", 'foreign key');
        $this->assertDbRejects("DELETE FROM color WHERE name = 'Bleu'", 'foreign key');
    }

    public function testSoftDeleteKeepsTheRow(): void
    {
        $rafael = $this->profile('rafael');
        $item = new Item($rafael, 'Lampe', $this->room($rafael));
        $this->persist($item);

        $item->softDelete();
        $this->em->flush();
        self::assertNotNull($this->fetchOne("SELECT deleted_at FROM item WHERE id = '{$item->getId()}'"));
        self::assertTrue($item->restore()->getDeletedAt() === null);
    }
}
