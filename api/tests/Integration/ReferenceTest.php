<?php

namespace App\Tests\Integration;

use App\Entity\Reference\Brand;
use App\Entity\Reference\ItemCategory;
use App\Entity\Reference\SizeSystem;
use App\Enum\Reference\SizeSystemCode;
use App\ReferenceData\ReferenceDataLoader;

final class ReferenceTest extends DatabaseTestCase
{
    public function testLoaderIsIdempotent(): void
    {
        $loader = self::getContainer()->get(ReferenceDataLoader::class);
        $brands = (int) $this->fetchOne('SELECT count(*) FROM brand');

        $report = $loader->load();

        foreach ($report as $table => $counts) {
            self::assertSame(0, $counts['created'], "$table : rien à créer sur une base déjà chargée");
        }
        self::assertSame($brands, (int) $this->fetchOne('SELECT count(*) FROM brand'));
    }

    public function testProposedBrandLifecycle(): void
    {
        $rafael = $this->profile('rafael');
        $collab = Brand::proposedBy('Mon Collab x Artiste', $rafael);
        $this->persist($collab);
        self::assertFalse($collab->isVerified());

        $this->assertInvalid(Brand::proposedBy('ZARA', $rafael), 'existe déjà');
        $this->assertInvalid(Brand::proposedBy('!!!', $rafael), 'aucune lettre');

        $collab->rename('Mon Collab X Artiste')->verify();
        self::assertTrue($collab->isVerified());
        self::assertSame('moncollabxartiste', $collab->getSlug());
    }

    public function testLoaderVerifiesAProposedBrandThatEntersTheList(): void
    {
        $thomas = $this->profile('thomas');
        $this->em->remove($this->em->getRepository(Brand::class)->findOneBy(['slug' => 'veja']));
        $this->em->flush();
        $this->persist(Brand::proposedBy('veja', $thomas));

        self::getContainer()->get(ReferenceDataLoader::class)->load();

        $veja = $this->em->getRepository(Brand::class)->findOneBy(['slug' => 'veja']);
        self::assertTrue($veja->isVerified());
        self::assertSame('Veja', $veja->getName());
        self::assertSame($thomas, $veja->getCreatedBy());
    }

    public function testSizesAreSortedAndCategoriesCarryTheirScale(): void
    {
        $kids = $this->em->getRepository(SizeSystem::class)->findOneBy(['code' => SizeSystemCode::KidsAge]);
        $labels = array_map(static fn ($v) => $v->getLabel(), $kids->getValues()->toArray());
        self::assertSame('Naissance', $labels[0]);
        self::assertLessThan(array_search('10 ans', $labels, true), array_search('2 ans', $labels, true));

        self::assertSame(['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'], $this->conn->fetchFirstColumn("SELECT v.label FROM size_value v JOIN size_system s ON s.id = v.size_system_id WHERE s.code = 'ALPHA' ORDER BY v.sort_order"));
        self::assertSame(SizeSystemCode::WaistLength, $this->garmentCategory('jeans')->getSizeSystem()?->getCode());
        self::assertSame(SizeSystemCode::KidsAge, $this->garmentCategory('enfant-hauts')->getSizeSystem()?->getCode());
    }

    public function testCategoryTreeRules(): void
    {
        $rafael = $this->profile('rafael');
        $thomas = $this->profile('thomas');
        $mine = (new ItemCategory('Outils de vélo', $rafael))->setParent($this->itemCategory('outillage'));
        $this->assertValid($mine);
        $this->persist($mine);
        self::assertSame('outils-de-velo', $mine->getSlug());

        $this->assertInvalid((new ItemCategory('Pédales', $thomas))->setParent($mine), 'autre profil');
        $this->assertInvalid((new ItemCategory('Système'))->setParent($mine), 'catégorie personnelle');
        $this->assertInvalid((new ItemCategory('N4', $rafael))->setParent((new ItemCategory('N3', $rafael))->setParent($mine)), 'niveaux');
        $a = new ItemCategory('A', $rafael);
        $b = (new ItemCategory('B', $rafael))->setParent($a);
        $a->setParent($b);
        $this->assertInvalid($a, 'ancêtre');
    }

    public function testDatabaseGuardsReferences(): void
    {
        $rafael = $this->profile('rafael');
        $this->persist((new ItemCategory('Outils de vélo', $rafael)));
        $outillage = $this->itemCategory('outillage')->getId();

        $this->assertDbRejects("INSERT INTO item_category (id, name, slug, owner_id, is_system, created_at, updated_at) VALUES ('01900000-0000-7000-8000-0000000000d1', 'X', 'outillage', NULL, true, now(), now())", 'uniq_item_category_system_slug');
        $this->assertDbRejects("INSERT INTO item_category (id, name, slug, owner_id, is_system, created_at, updated_at) VALUES ('01900000-0000-7000-8000-0000000000d2', 'X', 'outils-de-velo', '{$rafael->getId()}', false, now(), now())", 'uniq_item_category_owner_slug');
        $this->assertDbRejects("INSERT INTO item_category (id, name, slug, owner_id, is_system, created_at, updated_at) VALUES ('01900000-0000-7000-8000-0000000000d3', 'X', 'x', '{$rafael->getId()}', true, now(), now())", 'chk_item_category_system_owner');
        $this->assertDbRejects("UPDATE item_category SET parent_id = id WHERE id = '$outillage'", 'chk_item_category_not_own_parent');
        $this->assertDbRejects("UPDATE color SET hex = 'bleu' WHERE name = 'Bleu'", 'chk_color_hex');
        $this->assertDbRejects("UPDATE color SET hex = NULL WHERE name = 'Bleu'", 'chk_color_hex_unless_multi');
        $this->assertDbRejects("UPDATE brand SET slug = 'Zara Majuscule' WHERE slug = 'zara'", 'chk_brand_slug');
        $root = $this->itemCategory('bricolage-jardin')->getId();
        $this->assertDbRejects("DELETE FROM item_category WHERE id = '$root'", 'foreign key');
    }
}
