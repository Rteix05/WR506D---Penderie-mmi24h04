<?php

namespace App\Tests\Unit\Entity;

use App\Entity\Dressing\Outfit;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Place\Box;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Place\Storage;
use App\Entity\Reference\GarmentCategory;
use App\Entity\Sharing\BoxShare;
use App\Entity\Sharing\Collection;
use App\Entity\Sharing\CollectionEntry;
use App\Entity\Sharing\CollectionShare;
use App\Entity\Sharing\Contribution;
use App\Entity\Sharing\ItemShare;
use App\Entity\Sharing\OutfitShare;
use App\Entity\Sharing\Post;
use App\Entity\Sharing\Share;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use PHPUnit\Framework\TestCase;

/**
 * Les règles du partage portées par les entités : les propositions
 * (Contribution), les éléments de moodboard, la ressource mise en avant
 * par une publication. Les parcours persistés : tests/Integration
 * (ContributionTest, SharingTest).
 */
final class SharingRulesTest extends TestCase
{
    use EntityTestKit;

    private Profile $camille;
    private Profile $sophie;
    private Room $salon;

    protected function setUp(): void
    {
        $this->camille = self::adult('camille');
        $this->sophie = self::adult('sophie');
        $this->salon = new Room(new Place($this->camille, 'Maison'), 'Salon');
    }

    /**
     * Un droit de modifier à Sophie, sur une ressource de Camille.
     *
     * @template S of Share
     *
     * @param S $share
     *
     * @return S
     */
    private function grant(Share $share): Share
    {
        $share->addRecipient($this->sophie);

        return $share;
    }

    private function sophiesItem(string $name): Item
    {
        return new Item($this->sophie, $name, new Room(new Place($this->sophie, 'Studio'), 'Pièce'));
    }

    public function testDroppingSomethingInABoxGoesWhereTheBoxIs(): void
    {
        $armoire = new Storage($this->salon, 'Armoire');
        $carton = new Box($this->salon, 'Carton', storage: $armoire);
        $onBox = $this->grant(new BoxShare($this->camille, $carton, ShareAudience::Specific, AccessLevel::Edit));
        $livre = $this->sophiesItem('Livre');

        $proposal = Contribution::placePossession($this->sophie, $onBox, $livre, new Room(new Place($this->camille, 'Ailleurs'), 'Cave'), null, $carton);
        self::assertSame($this->salon, $proposal->getRoom(), 'la pièce du carton, pas celle demandée');
        self::assertSame($armoire, $proposal->getStorage());

        // Un droit sur un objet ne couvre aucun emplacement.
        $onItem = $this->grant(new ItemShare($this->camille, new Item($this->camille, 'Lampe', $this->salon), ShareAudience::Specific, AccessLevel::Edit));
        self::assertRefused('Ce droit de modifier ne couvre pas cet emplacement.', fn () => Contribution::placePossession($this->sophie, $onItem, $livre, $this->salon));
    }

    public function testAMoodboardTakesOnlyOnesOwnVisibleThingsOrText(): void
    {
        $board = new Collection($this->camille, 'Été');
        $onBoard = $this->grant(new CollectionShare($this->camille, $board, ShareAudience::Specific, AccessLevel::Edit));

        self::assertRefused('On ne pose sur un moodboard que ses propres affaires.', fn () => Contribution::addToCollection($this->sophie, $onBoard, new Item($this->camille, 'Lampe', $this->salon)));
        self::assertRefused('Un objet personnel ne se montre pas, même sur un moodboard.', fn () => Contribution::addToCollection($this->sophie, $onBoard, $this->sophiesItem('Journal')->setPersonal(true)));
        self::assertRefused('Un texte vide n\'est pas une contribution.', fn () => Contribution::addToCollection($this->sophie, $onBoard, '   '));

        $text = CollectionEntry::text($board, 'Tons sable');
        self::assertRefused('Un élément texte ne peut pas être vide.', fn () => $text->setCaption(''));
        self::assertSame('Tons ocre', $text->setCaption('Tons ocre')->getCaption());
    }

    public function testCorrectionsTargetWhatTheGrantCovers(): void
    {
        $chemises = new GarmentCategory('Chemises');
        $robe = new Garment($this->camille, 'Robe', $this->salon, $chemises);
        $outfit = (new Outfit($this->camille, 'Soirée'))->addGarment($robe);
        $onOutfit = $this->grant(new OutfitShare($this->camille, $outfit, ShareAudience::Specific, AccessLevel::Edit));

        self::assertSame(Outfit::class, Contribution::targetClass($onOutfit));
        self::assertRefused('Ce droit de modifier porte sur une autre cible.', fn () => Contribution::editFields($this->sophie, $onOutfit, new Outfit($this->camille, 'Autre'), ['name' => 'X']));
        self::assertRefused('Aucune correction proposée.', fn () => Contribution::editFields($this->sophie, $onOutfit, $outfit, []));
        self::assertRefused('Cette ressource ne se corrige pas par une proposition.', fn () => Contribution::typeOf(new \stdClass()));

        $proposal = Contribution::editFields($this->sophie, $onOutfit, $outfit, ['name' => 'Grande soirée']);
        self::assertRefused('Seul l\'auteur retire sa proposition.', fn () => $proposal->withdraw($this->camille));
    }

    public function testAPostFeaturesTheTargetOfItsShare(): void
    {
        $robe = new Garment($this->camille, 'Robe', $this->salon, new GarmentCategory('Robes'));
        $outfit = new Outfit($this->camille, 'Soirée');

        self::assertSame($robe, (new Post($this->camille, null, ShareAudience::Friends, true, $robe))->getFeatured());
        self::assertSame($outfit, (new Post($this->camille, null, ShareAudience::Friends, true, $outfit))->getFeatured());
        self::assertNull((new Post($this->camille, 'Bonjour', ShareAudience::Friends))->getFeatured());
    }

    public function testTheGhostSharesNothing(): void
    {
        self::assertRefused('Le profil fantôme ne partage rien.', fn () => new ItemShare(self::ghost(), new Item($this->camille, 'Lampe', $this->salon), ShareAudience::Friends));
    }
}
