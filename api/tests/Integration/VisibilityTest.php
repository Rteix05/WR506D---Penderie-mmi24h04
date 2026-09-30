<?php

namespace App\Tests\Integration;

use App\Entity\Dressing\Outfit;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Relation\Follow;
use App\Entity\Relation\Friendship;
use App\Entity\Sale\Listing;
use App\Entity\Sharing\GarmentShare;
use App\Entity\Sharing\ItemShare;
use App\Entity\Sharing\Post;
use App\Entity\Sharing\RoomShare;
use App\Enum\Sharing\AccessLevel as A;
use App\Enum\Sharing\ShareAudience as Au;
use App\Repository\Relation\FriendshipRepository;
use App\Security\ResourceAccess;

/**
 * Séance 8 — « Qui a le droit de voir ? » : le tableau et les quatre
 * situations, vérifiés sur le vrai modèle.
 *
 * Camille (propriétaire), Sophie (une amie), Hugo (un abonné), Paul (quelqu'un
 * qui passe : un compte sans aucun lien avec Camille).
 */
final class VisibilityTest extends DatabaseTestCase
{
    private ResourceAccess $access;
    private Profile $camille;
    private Profile $sophie;
    private Profile $hugo;
    private Profile $paul;
    private Room $dressing;

    protected function setUp(): void
    {
        parent::setUp();
        $this->access = new ResourceAccess($this->em, new FriendshipRepository(self::getContainer()->get('doctrine')));
        $this->camille = $this->profile('camille');
        $this->sophie = $this->profile('sophie');
        $this->hugo = $this->profile('hugo');
        $this->paul = $this->profile('paul');
        $this->persist((new Friendship($this->camille, $this->sophie))->accept(), new Follow($this->hugo, $this->camille));
        $place = new Place($this->camille, 'Appartement');
        $this->dressing = new Room($place, 'Penderie d\'été');
        $this->persist($place, $this->dressing);
    }

    private function garment(string $name, bool $personal = false): Garment
    {
        $g = (new Garment($this->camille, $name, $this->dressing, $this->garmentCategory('robes')))->setPersonal($personal);
        $this->persist($g);

        return $g;
    }

    /** @return array<string, string> VOIR / RIEN par personne */
    private function row(object $resource): array
    {
        $row = [];
        foreach (['camille' => $this->camille, 'sophie' => $this->sophie, 'hugo' => $this->hugo, 'paul' => $this->paul] as $who => $profile) {
            $row[$who] = match (true) {
                $this->access->isOwner($profile, $resource) => 'MODIFIER',
                $this->access->canRead($profile, $resource) => 'VOIR',
                default => 'RIEN',
            };
        }

        return $row;
    }

    public function testNothingIsVisibleByDefault(): void
    {
        $robe = $this->garment('Robe rouge');

        self::assertSame(['camille' => 'MODIFIER', 'sophie' => 'RIEN', 'hugo' => 'RIEN', 'paul' => 'RIEN'], $this->row($robe), 'ni l\'amitié ni l\'abonnement n\'ouvrent quoi que ce soit');
        self::assertSame(['camille' => 'MODIFIER', 'sophie' => 'RIEN', 'hugo' => 'RIEN', 'paul' => 'RIEN'], $this->row($this->dressing));
    }

    /** Le tableau de la séance, une fois les partages faits. */
    public function testTheTable(): void
    {
        $robe = $this->garment('Robe rouge');
        $journal = $this->garment('Journal intime', true);
        $look = (new Outfit($this->camille, 'Look de plage'))->addGarment($robe);
        $roomShare = new RoomShare($this->camille, $this->dressing, Au::Specific, A::Read);
        $roomShare->addRecipient($this->sophie);
        $this->persist($look, $roomShare, ...$roomShare->getRecipients()->toArray());
        $post = new Post($this->camille, 'Mon look de plage', Au::Followers, false, $look);
        $this->persist($post);

        self::assertSame(['camille' => 'MODIFIER', 'sophie' => 'VOIR', 'hugo' => 'VOIR', 'paul' => 'RIEN'], $this->row($robe), 'objet normal : Sophie via la pièce, Hugo via le look publié');
        self::assertSame(['camille' => 'MODIFIER', 'sophie' => 'RIEN', 'hugo' => 'RIEN', 'paul' => 'RIEN'], $this->row($journal), 'objet personnel : personne');
        self::assertSame(['camille' => 'MODIFIER', 'sophie' => 'VOIR', 'hugo' => 'RIEN', 'paul' => 'RIEN'], $this->row($this->dressing), 'pièce : seulement Sophie, à qui elle est partagée');
        self::assertSame(['camille' => 'MODIFIER', 'sophie' => 'RIEN', 'hugo' => 'VOIR', 'paul' => 'RIEN'], $this->row($look), 'look publié aux abonnés : Hugo');
        self::assertFalse($this->access->canComment($this->hugo, $look), 'un abonné ne commente pas');
    }

    /** Situation 1 : la penderie d'été partagée à Sophie contient un objet personnel. */
    public function testSituation1PersonalItemInASharedRoom(): void
    {
        $robe = $this->garment('Robe rouge');
        $journal = $this->garment('Journal intime', true);
        $share = new RoomShare($this->camille, $this->dressing, Au::Specific);
        $share->addRecipient($this->sophie);
        $this->persist($share, ...$share->getRecipients()->toArray());

        self::assertTrue($this->access->canRead($this->sophie, $robe));
        self::assertFalse($this->access->canRead($this->sophie, $journal), 'l\'objet personnel reste caché dans la pièce partagée');

        $this->expectException(\LogicException::class);
        new ItemShare($this->camille, (new Item($this->camille, 'Papiers', $this->dressing))->setPersonal(true), Au::Specific);
    }

    /** Situation 2 : un look publié dont un vêtement est en vente. */
    public function testSituation2LookWithAGarmentForSale(): void
    {
        $robe = $this->garment('Robe rouge');
        $listing = (new Listing($robe, '30.00'))->publish();
        $look = (new Outfit($this->camille, 'Look de plage'))->addGarment($robe);
        $this->persist($listing, $look);
        $this->persist(new Post($this->camille, 'Mon look', Au::Followers, false, $look));

        self::assertTrue($this->access->canRead($this->hugo, $look), 'l\'abonné voit le look');
        self::assertTrue($this->access->canRead($this->hugo, $robe), 'et le vêtement, puisqu\'il est dans le look publié');
        // Ce qu'il voit « exactement » du vêtement (sans notes privées ni emplacement) et de
        // l'annonce (visible seulement si son audience inclut les abonnés, achat réservé aux amis)
        // est vérifié par l'API : voir tests/Api/VisibilityApiTest.
        self::assertFalse($this->access->canRead($this->hugo, $this->dressing), 'mais pas la pièce où il est rangé');
    }

    /** Situation 3 : un lien envoyé à Sophie, transféré à sa sœur. */
    public function testSituation3ForwardedLink(): void
    {
        $robe = $this->garment('Robe rouge');
        $journal = $this->garment('Journal intime', true);
        $link = new RoomShare($this->camille, $this->dressing, Au::Link);
        $this->persist($link);
        $token = $link->getToken();

        // Le lien est un « porteur » : la sœur voit exactement ce que Sophie voit.
        self::assertTrue($this->access->canReadWithLink($token, $robe));
        self::assertFalse($this->access->canReadWithLink($token, $journal), 'jamais l\'objet personnel');
        self::assertFalse($this->access->canReadWithLink('un-autre-jeton', $robe));
        self::assertFalse($this->access->canRead($this->paul, $robe), 'un lien ne s\'applique à aucun compte : seulement à qui présente le jeton');

        // Parade : Camille révoque (ou fait expirer) le lien, pour Sophie ET pour sa sœur.
        $link->revoke();
        self::assertFalse($this->access->canReadWithLink($token, $robe));
    }

    /** Situation 4 : Camille retire Sophie de ses amis. */
    public function testSituation4UnfriendRemovesAccessImmediately(): void
    {
        $robe = $this->garment('Robe rouge');
        $toFriends = new GarmentShare($this->camille, $robe, Au::Friends);
        $named = new RoomShare($this->camille, $this->dressing, Au::Specific);
        $named->addRecipient($this->sophie);
        $this->persist($toFriends, $named, ...$named->getRecipients()->toArray());
        self::assertTrue($this->access->canRead($this->sophie, $robe));

        $this->conn->executeStatement('DELETE FROM friendship');

        self::assertFalse($this->access->canRead($this->sophie, $robe), 'plus amie : le partage aux amis ne s\'applique plus');
        self::assertFalse($this->access->canRead($this->sophie, $this->dressing), 'même nommée : il faut rester amie');
    }

    public function testEditIsOnlyForNamedPeopleAndResharingIsReadOnly(): void
    {
        $robe = $this->garment('Robe rouge');
        $grant = new GarmentShare($this->camille, $robe, Au::Specific, A::Edit);
        $grant->addRecipient($this->sophie);
        $this->persist($grant, ...$grant->getRecipients()->toArray());

        self::assertSame($grant, $this->access->editGrant($this->sophie, $robe));
        self::assertFalse($this->access->isOwner($this->sophie, $robe), 'modifier n\'est pas posséder');

        $reshare = new GarmentShare($this->sophie, $robe, Au::Friends, A::Read, $grant);
        self::assertTrue($reshare->isReshare());
        self::assertSame($this->camille, $reshare->getOwner(), 'l\'objet reste celui de Camille');
        self::assertSame($this->sophie, $reshare->getSharedBy());

        foreach ([
            fn () => new GarmentShare($this->sophie, $robe, Au::Specific, A::Edit, $grant),
            fn () => new GarmentShare($this->hugo, $robe, Au::Friends, A::Read, $grant),
            fn () => new GarmentShare($this->sophie, $robe, Au::Friends, A::Read),
        ] as $forbidden) {
            try {
                $forbidden();
                self::fail('Repartage interdit accepté.');
            } catch (\LogicException) {
                $this->addToAssertionCount(1);
            }
        }
    }
}
