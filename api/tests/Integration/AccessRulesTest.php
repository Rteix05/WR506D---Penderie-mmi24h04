<?php

namespace App\Tests\Integration;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Item;
use App\Entity\Loan\Loan;
use App\Entity\Place\Box;
use App\Entity\Relation\Friendship;
use App\Entity\Sale\Listing;
use App\Entity\Sharing\BoxShare;
use App\Entity\Sharing\ItemShare;
use App\Entity\Sharing\Post;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use App\Repository\Relation\FriendshipRepository;
use App\Security\CurrentProfile;
use App\Security\ResourceAccess;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

/**
 * Qui lit, qui commente : les cas de ResourceAccess que les parcours
 * de domaine (FlatshareTest, SharingTest…) ne traversent pas, et la
 * résolution du profil courant (CurrentProfile).
 */
final class AccessRulesTest extends DatabaseTestCase
{
    private ResourceAccess $access;
    private Profile $camille;
    private Profile $thomas;

    protected function setUp(): void
    {
        parent::setUp();
        $this->access = new ResourceAccess($this->em, new FriendshipRepository(self::getContainer()->get('doctrine')));
        $this->camille = $this->profile('camille');
        $this->thomas = $this->profile('thomas');
        $this->persist((new Friendship($this->camille, $this->thomas))->accept());
    }

    public function testTheBorrowerSeesTheLoanAndEveryoneSeesSystemCategories(): void
    {
        $velo = new Item($this->camille, 'Vélo', $this->room($this->camille));
        $loan = Loan::offer($velo, $this->thomas);
        $this->persist($velo, $loan);

        self::assertTrue($this->access->canRead($this->thomas, $loan), 'l\'emprunteur voit son prêt');
        self::assertTrue($this->access->canRead($this->profile('inconnu'), $this->garmentCategory('jeans')));
    }

    public function testCommentingNeedsAFriendsShareAndNeverOnAPersonalItem(): void
    {
        $chambre = $this->room($this->camille);
        $lampe = new Item($this->camille, 'Lampe', $chambre);
        $journal = (new Item($this->camille, 'Journal', $chambre))->setPersonal(true);
        $carton = new Box($chambre, 'Carton');
        $livre = (new Item($this->camille, 'Livre', $chambre))->setBox($carton);
        $this->persist($lampe, $journal, $carton, $livre);

        self::assertTrue($this->access->canComment($this->camille, $journal), 'le propriétaire commente tout');
        self::assertFalse($this->access->canComment($this->thomas, $journal), 'un objet personnel, jamais');
        self::assertFalse($this->access->canComment($this->thomas, $lampe), 'rien de partagé');

        $share = new ItemShare($this->camille, $lampe, ShareAudience::Friends, AccessLevel::Read);
        $this->persist($share, new BoxShare($this->camille, $carton, ShareAudience::Friends));
        self::assertTrue($this->access->canComment($this->thomas, $lampe));
        self::assertTrue($this->access->canComment($this->thomas, $livre), 'le partage du carton couvre ce qu\'il contient');

        $share->revoke();
        self::assertFalse($this->access->appliesTo($share, $this->thomas), 'un partage révoqué ne vaut plus rien');
    }

    public function testListingsAndPostsAreReadOnlyWhileLive(): void
    {
        $velo = new Item($this->camille, 'Vélo', $this->room($this->camille));
        $brouillon = new Listing($velo, '80.00');
        $this->persist($velo, $brouillon);
        self::assertFalse($this->access->canRead($this->thomas, $brouillon), 'une annonce non publiée reste chez le vendeur');

        $choisie = new Post($this->camille, 'Pour toi', ShareAudience::Specific, true, $velo);
        $recipient = $choisie->getShare()?->addRecipient($this->thomas);
        $amis = new Post($this->camille, 'Pour mes amis', ShareAudience::Friends);
        $this->persist($choisie, $recipient, $amis);
        self::assertTrue($this->access->canRead($this->thomas, $choisie), 'publication à des personnes choisies');
        self::assertFalse($this->access->canRead($this->profile('julie'), $choisie));

        $amis->softDelete();
        self::assertFalse($this->access->canRead($this->thomas, $amis), 'une publication supprimée disparaît');
    }

    public function testOneIsNotOwnFlatmate(): void
    {
        self::assertFalse($this->access->areFlatmates($this->camille, $this->camille));
    }

    public function testCurrentProfileNeedsAnAccountWithAProfile(): void
    {
        $current = self::getContainer()->get(CurrentProfile::class);
        try {
            $current->account();
            self::fail('Aucun compte connecté, et pourtant un compte.');
        } catch (AccessDeniedException) {
            $this->addToAssertionCount(1);
        }

        // Un compte sans aucun profil (un administrateur, par exemple).
        $admin = $this->admin();
        self::getContainer()->get('security.token_storage')->setToken(new UsernamePasswordToken($admin, 'api', $admin->getRoles()));
        $this->expectException(AccessDeniedException::class);
        $this->expectExceptionMessage('aucun profil');
        $current->get();
    }
}
