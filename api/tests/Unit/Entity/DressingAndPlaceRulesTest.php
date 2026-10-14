<?php

namespace App\Tests\Unit\Entity;

use App\Entity\Dressing\DailyLook;
use App\Entity\Dressing\GarmentVisibilityPreference;
use App\Entity\Dressing\LookTag;
use App\Entity\Dressing\Outfit;
use App\Entity\Dressing\OutfitSuggestion;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Media\Media;
use App\Entity\Notification\ModerationAction;
use App\Entity\Identity\Account;
use App\Entity\Place\Place;
use App\Entity\Place\PlaceDecision;
use App\Entity\Place\Room;
use App\Entity\Reference\Color;
use App\Entity\Reference\GarmentCategory;
use App\Entity\Reference\SizeSystem;
use App\Entity\Reference\SizeValue;
use App\Entity\Reference\Style;
use App\Entity\Relation\Follow;
use App\Entity\Relation\Friendship;
use App\Enum\Dressing\LookStatus;
use App\Enum\Dressing\LookTagStatus;
use App\Enum\Inventory\GarmentUsage;
use App\Enum\Notification\ModerationActionType;
use App\Enum\Notification\ModerationTargetType;
use App\Enum\Place\PlaceDecisionStatus;
use App\Enum\Reference\ColorFamily;
use App\Enum\Reference\SizeSystemCode;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Uid\Uuid;

/**
 * Les règles des entités du dressing, des logements, des relations et des
 * référentiels, sans base de données. Les parcours persistés sont dans
 * tests/Integration (DressingTest, FlatshareTest, RelationTest…).
 */
final class DressingAndPlaceRulesTest extends TestCase
{
    use EntityTestKit;

    private Profile $camille;
    private Room $chambre;
    private GarmentCategory $hauts;
    private GarmentCategory $chemises;

    protected function setUp(): void
    {
        $this->camille = self::adult('camille');
        $this->chambre = new Room(new Place($this->camille, 'Appart'), 'Chambre', createdBy: $this->camille);
        $this->hauts = new GarmentCategory('Hauts');
        $this->chemises = (new GarmentCategory('Chemises'))->setParent($this->hauts);
    }

    private function garment(string $name): Garment
    {
        return new Garment($this->camille, $name, $this->chambre, $this->chemises);
    }

    private function look(): DailyLook
    {
        return new DailyLook($this->camille, new Media($this->camille, '2026/10/look.jpg', 'image/jpeg', 10));
    }

    public function testALookIsTaggedThenReadyThenPosted(): void
    {
        $look = $this->look();
        self::assertRefused('Place au moins un point sur un vêtement.', fn () => $look->moveTo(LookStatus::Ready));

        $first = $look->addTag(0.2, 0.3);
        $second = $look->addTag(0.6, 0.7);
        self::assertSame(1, $second->getPosition(), 'le point suivant prend la place suivante');
        self::assertRefused('Chaque point doit désigner un vêtement de ton dressing.', fn () => $look->moveTo(LookStatus::Ready));

        $first->confirm($this->garment('Chemise'));
        $second->confirm($this->garment('Chemise blanche'));
        $look->moveTo(LookStatus::Ready);
        $look->moveTo(LookStatus::Ready); // déjà prêt : rien ne change
        self::assertSame(LookStatus::Ready, $look->getStatus());

        $look->moveTo(LookStatus::Posted);
        self::assertRefused('Ce look est déjà posté : il ne se modifie plus.', fn () => $look->moveTo(LookStatus::Ready));
    }

    public function testALookHasAtMostTwelvePoints(): void
    {
        $look = $this->look();
        for ($i = 0; $i < DailyLook::MAX_TAGS; ++$i) {
            $look->addTag(0.5, 0.5);
        }

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('12 vêtements au plus par look.');
        $look->addTag(0.5, 0.5);
    }

    /** Un vêtement confirmé, puis réellement supprimé (ON DELETE SET NULL) : le point redevient inconnu. */
    public function testAPointWhoseGarmentWasDeletedIsUnknownAgain(): void
    {
        $tag = $this->look()->addTag(0.5, 0.5);
        $tag->confirm($this->garment('Chemise'));
        (new \ReflectionProperty(LookTag::class, 'garment'))->setValue($tag, null);

        self::assertSame(LookTagStatus::Unknown, $tag->getStatus());
    }

    public function testHidingRulesMatchOnEveryCriterion(): void
    {
        self::assertRefused('Une règle de masquage a au moins un critère.', fn () => new GarmentVisibilityPreference($this->camille));

        $noir = new Color('Noir', '#000000', ColorFamily::Black);
        $chic = new Style('chic', 'Chic');
        $chemise = $this->garment('Chemise')->addColor($noir)->addStyle($chic)->addStyle($chic);
        self::assertCount(1, $chemise->getStyles(), 'un style ne s\'ajoute qu\'une fois');

        self::assertTrue((new GarmentVisibilityPreference($this->camille, $this->hauts, $noir, $chic))->matches($chemise), '« Hauts » couvre les chemises');
        self::assertFalse((new GarmentVisibilityPreference($this->camille, null, null, new Style('sport', 'Sport')))->matches($chemise));
    }

    public function testOutfitsAndSuggestionsKeepEachPieceOnce(): void
    {
        $chemise = $this->garment('Chemise');
        $outfit = (new Outfit($this->camille, 'Bureau'))->addGarment($chemise)->addGarment($chemise);
        self::assertCount(1, $outfit->getPieces());
        $outfit->removeGarment($chemise);
        self::assertCount(0, $outfit->getPieces());

        self::assertRefused('Une suggestion propose au moins une pièce.', fn () => new OutfitSuggestion($this->camille, GarmentUsage::Work, []));
        $pull = $this->garment('Pull');
        $suggestion = new OutfitSuggestion($this->camille, GarmentUsage::Work, [$chemise, $pull]);
        self::assertRefused('Cette pièce fait déjà partie de la suggestion.', fn () => $suggestion->swapGarment($chemise, $pull));
        self::assertRefused('Cette pièce ne fait pas partie de la suggestion.', fn () => $suggestion->swapGarment($this->garment('Veste'), $this->garment('Gilet')));
    }

    public function testDecisionsOfAPlace(): void
    {
        $appart = new Place($this->camille, 'Appart');
        $marc = self::adult('marc');
        self::assertRefused('Seul un membre du logement demande une décision commune.', fn () => PlaceDecision::deletePlace($appart, $marc));
        self::assertRefused('Cette personne fait déjà partie du logement.', fn () => PlaceDecision::inviteMember($appart, $this->camille, $this->camille));

        $chambre = (new Room($appart, 'Chambre', createdBy: $this->camille))->close($this->camille);
        self::assertRefused('Une pièce fermée se supprime par celui qui l\'a créée, sans vote.', fn () => PlaceDecision::deleteRoom($chambre, $this->camille));

        $invitation = PlaceDecision::inviteMember($appart, $this->camille, $marc);
        self::assertRefused('Seul celui qui l\'a demandée retire une décision.', fn () => $invitation->cancel($marc));
        $invitation->cancel($this->camille);
        self::assertSame(PlaceDecisionStatus::Cancelled, $invitation->getStatus());
        self::assertFalse($invitation->settle(), 'une décision close ne se recompte plus');
        self::assertRefused('Cette décision est déjà close (CANCELLED).', fn () => $invitation->cancel($this->camille));
    }

    public function testOnlyAMemberIsAllowedInAClosedRoom(): void
    {
        $chambre = (new Room(new Place($this->camille, 'Appart'), 'Chambre', createdBy: $this->camille))->close($this->camille);
        $voisin = self::adult('voisin');

        self::assertRefused('On n\'autorise dans une pièce qu\'un membre du logement.', fn () => $chambre->allow($this->camille, $voisin));
        self::assertRefused('Seul celui qui a créé la pièce y retire une autorisation.', fn () => $chambre->disallow($voisin, $voisin));
    }

    public function testRelationsAndTheGhost(): void
    {
        $thomas = self::adult('thomas');
        self::assertRefused('Le profil fantôme n\'a pas de relations.', fn () => new Follow($thomas, self::ghost()));

        $friendship = (new Friendship($this->camille, $thomas))->accept();
        self::assertSame($thomas, $friendship->getOther($this->camille));
        self::assertRefused('Ce profil ne fait pas partie de cette amitié.', fn () => $friendship->getOther(self::adult('julie')));
        self::assertRefused('Cette demande a déjà reçu une réponse (ACCEPTED).', fn () => $friendship->decline());
    }

    public function testModerationRestoreAppliesToAnyTarget(): void
    {
        $admin = (new Account('admin@exemple.fr'))->setRoles([Account::ROLE_ADMIN]);
        foreach (ModerationTargetType::cases() as $target) {
            $action = new ModerationAction($admin, ModerationActionType::Restore, $target, Uuid::v7(), 'Erreur de modération');
            self::assertSame($target, $action->getTargetType());
        }
    }

    public function testASizeValueJoinsItsScaleOnce(): void
    {
        $alpha = new SizeSystem(SizeSystemCode::Alpha, 'Taille lettre');
        $m = new SizeValue($alpha, 'M', 4);
        $alpha->attachValue($m);

        self::assertSame([$m], $alpha->getValues()->toArray());
    }
}
