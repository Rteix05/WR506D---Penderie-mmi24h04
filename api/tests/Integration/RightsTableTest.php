<?php

namespace App\Tests\Integration;

use App\Entity\Dressing\Outfit;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Loan\Loan;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Place\Storage;
use App\Entity\Reference\GarmentCategory;
use App\Entity\Relation\Follow;
use App\Entity\Relation\Friendship;
use App\Entity\Sale\Listing;
use App\Entity\Sharing\ItemShare;
use App\Entity\Sharing\Post;
use App\Entity\Sharing\RoomShare;
use App\Enum\Identity\ProfileType;
use App\Enum\Sale\ListingAudience;
use App\Enum\Sharing\ShareAudience as Au;
use App\Repository\Relation\FriendshipRepository;
use App\Security\ResourceAccess;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * LE TABLEAU DES DROITS (docs/PENDERIE_DROITS_v2.xlsx), case par case.
 *
 * Chaque ligne du tableau est une ressource de Camille, chaque colonne un
 * profil qui la regarde ; ResourceAccess::level() doit rendre exactement
 * la case. Si le tableau change, ce test change avec lui.
 *
 *  Propriétaire : Camille.
 *  Coloc        : Marc, membre du même logement (autre compte).
 *  Profil +18   : Léo, adulte, même compte que Camille.
 *  Profil −18   : Lina, enfant, même compte (Camille est sa tutrice).
 *  Amis         : Sophie.
 *  Abonnés      : Hugo, qui suit Camille.
 *  Public       : Paul, aucun lien (compte privé : rien de public).
 *
 * Le logement « Appart » : le Salon est COMMUN (partagé aussi aux amis de
 * Camille), la Chambre de Camille est FERMÉE aux colocs.
 */
final class RightsTableTest extends DatabaseTestCase
{
    private const COLUMNS = ['Propriétaire', 'Coloc', 'Profil +18', 'Profil −18', 'Amis', 'Abonnés', 'Public'];

    private ResourceAccess $access;
    /** @var array<string, Profile> */
    private array $who = [];
    /** @var array<string, object> */
    private array $what = [];

    /** @return iterable<string, array{string, list<string>}> ligne du tableau → [ressource, cases] */
    public static function table(): iterable
    {
        yield 'Objet normal (partagé aux abonnés)' => ['lampe', ['ADMIN', 'VIEW', 'EDIT', 'VIEW', 'VIEW', 'VIEW', 'DENIED']];
        yield 'Objet normal non partagé (pièce fermée)' => ['carnet', ['ADMIN', 'DENIED', 'EDIT', 'VIEW', 'DENIED', 'DENIED', 'DENIED']];
        yield 'Objet marqué « personnel »' => ['journal', ['ADMIN', 'DENIED', 'DENIED', 'DENIED', 'DENIED', 'DENIED', 'DENIED']];
        yield 'Catégories' => ['categorie', ['ADMIN', 'DENIED', 'EDIT', 'EDIT', 'DENIED', 'DENIED', 'DENIED']];
        yield 'Pièce > rangement (privé par défaut)' => ['penderie', ['ADMIN', 'DENIED', 'EDIT', 'EDIT', 'DENIED', 'DENIED', 'DENIED']];
        yield 'Pièce > rangement partagé' => ['etagere', ['ADMIN', 'EDIT', 'EDIT', 'EDIT', 'VIEW', 'DENIED', 'DENIED']];
        yield 'Pièce (fermée)' => ['chambre', ['ADMIN', 'DENIED', 'EDIT', 'VIEW', 'DENIED', 'DENIED', 'DENIED']];
        yield 'Pièce partagée / commune de la coloc' => ['salon', ['ADMIN', 'EDIT', 'EDIT', 'VIEW', 'VIEW', 'DENIED', 'DENIED']];
        yield 'Logement' => ['appart', ['ADMIN', 'ADMIN', 'VIEW', 'VIEW', 'DENIED', 'DENIED', 'DENIED']];
        yield 'Un look publié' => ['look', ['ADMIN', 'VIEW', 'VIEW', 'VIEW', 'VIEW', 'VIEW', 'DENIED']];
        yield 'Un look publié > voir 1 objet normal' => ['robe', ['ADMIN', 'VIEW', 'EDIT', 'VIEW', 'VIEW', 'VIEW', 'DENIED']];
        yield 'Prêts' => ['pret', ['ADMIN', 'VIEW', 'VIEW', 'VIEW', 'VIEW', 'DENIED', 'DENIED']];
        yield 'Ventes (amis seulement, par défaut)' => ['vente', ['ADMIN', 'VIEW', 'VIEW', 'VIEW', 'VIEW', 'DENIED', 'DENIED']];
        yield 'Ventes ouvertes aux abonnés' => ['venteAbonnes', ['ADMIN', 'VIEW', 'VIEW', 'VIEW', 'VIEW', 'VIEW', 'DENIED']];
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->access = new ResourceAccess($this->em, new FriendshipRepository(self::getContainer()->get('doctrine')));

        $camille = $this->profile('camille');
        $this->who = [
            'Propriétaire' => $camille,
            'Coloc' => $this->profile('marc'),
            'Profil +18' => $this->profile('leo', ProfileType::Adult, null, $camille->getAccount()),
            'Profil −18' => $this->child('lina', $camille),
            'Amis' => $this->profile('sophie'),
            'Abonnés' => $this->profile('hugo'),
            'Public' => $this->profile('paul'),
        ];
        $nina = $this->profile('nina');
        $this->persist((new Friendship($camille, $this->who['Amis']))->accept(), new Follow($this->who['Abonnés'], $camille));

        $appart = new Place($camille, 'Appart');
        $appart->addMember($this->who['Coloc']);
        $salon = new Room($appart, 'Salon');
        $chambre = (new Room($appart, 'Chambre de Camille'))->close($camille);
        $this->persist($appart, $salon, $chambre);
        $etagere = new Storage($salon, 'Étagère');
        $penderie = new Storage($chambre, 'Penderie');
        $robes = $this->garmentCategory('robes');

        $lampe = new Item($camille, 'Lampe', $salon);
        $carnet = new Item($camille, 'Carnet', $chambre);
        $journal = (new Item($camille, 'Journal intime', $salon))->setPersonal(true);
        $robe = new Garment($camille, 'Robe rouge', $chambre, $robes);
        $perceuse = new Item($camille, 'Perceuse', $salon);
        $veste = new Garment($camille, 'Veste', $salon, $robes);
        $manteau = new Garment($camille, 'Manteau', $salon, $robes);
        $this->persist($etagere, $penderie, $lampe, $carnet, $journal, $robe, $perceuse, $veste, $manteau);

        $look = (new Outfit($camille, 'Look de plage'))->addGarment($robe);
        $this->persist($look);
        $vente = (new Listing($veste, '30.00'))->publish();
        $venteAbonnes = (new Listing($manteau, '60.00'))->setAudience(ListingAudience::FriendsAndFollowers)->publish();
        $this->persist(
            new RoomShare($camille, $salon, Au::Friends),
            new ItemShare($camille, $lampe, Au::Followers),
            new Post($camille, 'Mon look', Au::Followers, false, $look),
            $pret = Loan::offer($perceuse, $nina),
            $vente,
            $venteAbonnes,
            $categorie = new GarmentCategory('Tenues de gala', $camille),
        );

        $this->what = compact('lampe', 'carnet', 'journal', 'categorie', 'penderie', 'etagere', 'chambre', 'salon', 'appart', 'look', 'robe', 'pret', 'vente', 'venteAbonnes');
    }

    /** @param list<string> $expected */
    #[DataProvider('table')]
    public function testRow(string $resource, array $expected): void
    {
        $actual = [];
        foreach (self::COLUMNS as $column) {
            $actual[$column] = $this->access->level($this->who[$column], $this->what[$resource])->value;
        }

        self::assertSame(array_combine(self::COLUMNS, $expected), $actual);
    }

    /** En colocation, un partage ne montre que les affaires de celui qui partage : jamais celles d'un coloc. */
    public function testSharingTheCommonRoomNeverShowsAFlatmatesThings(): void
    {
        $marc = $this->who['Coloc'];
        $salon = $this->what['salon'];
        $guitare = new Item($marc, 'Guitare de Marc', $salon);
        $this->persist($guitare);

        self::assertSame('VIEW', $this->access->level($this->who['Propriétaire'], $guitare)->value, 'Camille voit la guitare de Marc (pièce commune)…');
        self::assertSame('DENIED', $this->access->level($this->who['Amis'], $guitare)->value, '… mais Sophie, amie de Camille, non, même si Camille partage le Salon');
        self::assertSame('ADMIN', $this->access->level($marc, $guitare)->value);
    }

    /** La colocation ne s'étend pas au-delà du logement : Marc ne voit rien de ce que Camille range ailleurs. */
    public function testFlatmateSeesNothingOutsideTheFlat(): void
    {
        $ailleurs = new Item($this->who['Propriétaire'], 'Vélo', $this->room($this->who['Propriétaire'], 'Cave'));
        $this->persist($ailleurs);

        self::assertSame('DENIED', $this->access->level($this->who['Coloc'], $ailleurs)->value);
        self::assertSame('EDIT', $this->access->level($this->who['Profil +18'], $ailleurs)->value, 'le foyer, lui, voit tout');
    }
}
