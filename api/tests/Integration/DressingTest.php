<?php

namespace App\Tests\Integration;

use App\Entity\Dressing\ColorPreference;
use App\Entity\Dressing\GarmentExclusion;
use App\Entity\Dressing\GarmentVisibilityPreference;
use App\Entity\Dressing\Outfit;
use App\Entity\Dressing\OutfitSuggestion;
use App\Entity\Dressing\WearLog;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Place\Room;
use App\Enum\Dressing\OutfitSource;
use App\Enum\Dressing\Sentiment;
use App\Enum\Dressing\SuggestionStatus;
use App\Enum\Dressing\Weather;
use App\Enum\Inventory\GarmentUsage as U;

final class DressingTest extends DatabaseTestCase
{
    private Profile $rafael;
    private Room $room;

    protected function setUp(): void
    {
        parent::setUp();
        $this->rafael = $this->profile('rafael');
        $this->room = $this->room($this->rafael, 'Chambre');
    }

    private function garment(string $name, string $category, string ...$colors): Garment
    {
        $garment = new Garment($this->rafael, $name, $this->room, $this->garmentCategory($category));
        foreach ($colors as $color) {
            $garment->addColor($this->color($color));
        }
        $this->persist($garment);

        return $garment;
    }

    public function testSuggestionWithASwapBecomesAnOutfit(): void
    {
        $noir = $this->garment('T-shirt noir', 't-shirts', 'Noir');
        $blanc = $this->garment('T-shirt blanc', 't-shirts', 'Blanc');
        $jean = $this->garment('Jean', 'jeans');

        $suggestion = new OutfitSuggestion($this->rafael, U::Everyday, [$noir, $jean], 18, Weather::Cloudy);
        $suggestion->swapGarment($noir, $blanc);
        $this->persist($suggestion);
        self::assertSame([$blanc, $jean], $suggestion->getKeptGarments());
        self::assertSame(1, (int) $this->fetchOne("SELECT count(*) FROM outfit_suggestion_garment WHERE was_replaced"));

        $outfit = $suggestion->accept('Samedi');
        $this->persist($outfit);
        self::assertSame(SuggestionStatus::Accepted, $suggestion->getStatus());
        self::assertSame(OutfitSource::FromSuggestion, $outfit->getSource());
        self::assertSame([$blanc, $jean], $outfit->getGarments());

        $this->expectException(\LogicException::class);
        $suggestion->reject();
    }

    public function testWearingAnOutfitLogsTheWearer(): void
    {
        $lea = $this->child('lea', $this->rafael);
        $outfit = (new Outfit($this->rafael, 'Tenue'))->addGarment($this->garment('Pull', 'pulls'))->addGarment($this->garment('Jean', 'jeans'));
        $this->persist($outfit, ...$outfit->wear($lea));

        self::assertSame(2, (int) $this->fetchOne("SELECT count(*) FROM wear_log WHERE profile_id = '{$lea->getId()}'"));
        $this->expectException(\LogicException::class);
        new WearLog($outfit->getGarments()[0], $lea, new \DateTimeImmutable('+1 day'));
    }

    public function testVisibilityRulesCombineWithAnd(): void
    {
        $tshirtNoir = $this->garment('T-shirt noir', 't-shirts', 'Noir');
        $tshirtBlanc = $this->garment('T-shirt blanc', 't-shirts', 'Blanc');
        $chemiseNoire = $this->garment('Chemise noire', 'chemises', 'Noir');
        $jean = $this->garment('Jean', 'jeans', 'Bleu marine');

        $both = new GarmentVisibilityPreference($this->rafael, $this->garmentCategory('t-shirts'), $this->color('Noir'));
        self::assertTrue($both->matches($tshirtNoir));
        self::assertFalse($both->matches($tshirtBlanc));
        self::assertFalse($both->matches($chemiseNoire));

        $black = new GarmentVisibilityPreference($this->rafael, null, $this->color('Noir'));
        self::assertTrue($black->matches($chemiseNoire));
        self::assertFalse($black->matches($jean));

        $tops = new GarmentVisibilityPreference($this->rafael, $this->garmentCategory('hauts'));
        self::assertTrue($tops->matches($tshirtBlanc), 'la catégorie couvre ses sous-catégories');
        self::assertFalse($tops->matches($jean));

        self::assertFalse($black->reactivate()->matches($chemiseNoire));
    }

    public function testNullAwareUniquenessInDatabase(): void
    {
        $chemise = $this->garment('Chemise', 'chemises', 'Noir');
        $this->persist(
            new GarmentVisibilityPreference($this->rafael, null, $this->color('Noir')),
            new ColorPreference($this->rafael, $this->color('Bleu marine'), Sentiment::Like),
            new ColorPreference($this->rafael, $this->color('Bleu marine'), Sentiment::Dislike, U::Sport),
            new GarmentExclusion($this->rafael, $chemise, 'Trop serrée'),
        );
        $r = $this->rafael->getId();
        $noir = $this->color('Noir')->getId();
        $marine = $this->color('Bleu marine')->getId();

        $this->assertInvalid(new ColorPreference($this->rafael, $this->color('Bleu marine'), Sentiment::Dislike), 'existe déjà');
        $this->assertDbRejects("INSERT INTO garment_visibility_preference (id, profile_id, color_id, hidden_at) VALUES ('01900000-0000-7000-8000-0000000000d2', '$r', '$noir', now())", 'uniq_visibility_pref_active');
        $this->assertDbRejects("INSERT INTO garment_visibility_preference (id, profile_id, hidden_at) VALUES ('01900000-0000-7000-8000-0000000000d3', '$r', now())", 'chk_visibility_pref_criterion');
        $this->assertDbRejects("INSERT INTO color_preference (id, profile_id, color_id, sentiment, context, created_at, updated_at) VALUES ('01900000-0000-7000-8000-0000000000d4', '$r', '$marine', 'LIKE', NULL, now(), now())", 'uniq_color_preference');
        $this->assertDbRejects("INSERT INTO garment_exclusion (id, profile_id, garment_id, excluded_at) VALUES ('01900000-0000-7000-8000-0000000000d5', '$r', '{$chemise->getId()}', now())", 'uniq_garment_exclusion_active');
    }

    public function testDatabaseGuardsOutfits(): void
    {
        $jean = $this->garment('Jean', 'jeans');
        $suggestion = new OutfitSuggestion($this->rafael, U::Work, [$jean]);
        $outfit = $suggestion->accept('Bureau');
        $this->persist($suggestion, $outfit, new WearLog($jean, $this->rafael));

        $this->assertDbRejects("UPDATE outfit_suggestion SET decided_at = NULL", 'chk_outfit_suggestion_decided');
        $this->assertDbRejects('UPDATE outfit_suggestion SET temperature = 99', 'chk_outfit_suggestion_temperature');
        $this->assertDbRejects("UPDATE outfit SET source = 'MANUAL'", 'chk_outfit_source_suggestion');
        $this->assertDbRejects("INSERT INTO wear_log (id, garment_id, profile_id, worn_at) VALUES ('01900000-0000-7000-8000-0000000000d6', '{$jean->getId()}', '{$this->rafael->getId()}', CURRENT_DATE)", 'uniq_wear_log_day');
    }
}
