<?php

namespace App\Tests\Integration;

use App\Entity\Dressing\ColorPreference;
use App\Entity\Dressing\GarmentVisibilityPreference;
use App\Entity\Dressing\Outfit;
use App\Entity\Dressing\WearLog;
use App\Entity\Identity\ApprovalRequest;
use App\Entity\Identity\Profile;
use App\Entity\Identity\ProfilePermission;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Loan\Loan;
use App\Entity\Media\Media;
use App\Entity\Notification\Notification;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Reference\ItemCategory;
use App\Entity\Relation\Follow;
use App\Entity\Relation\Friendship;
use App\Entity\Sale\Listing;
use App\Entity\Sharing\Collection;
use App\Entity\Sharing\ItemComment;
use App\Entity\Sharing\ItemShare;
use App\Entity\Sharing\Post;
use App\Enum\Dressing\Sentiment;
use App\Enum\Identity\Permission;
use App\Enum\Identity\PermissionMode;
use App\Enum\Loan\LoanStatus;
use App\Enum\Notification\NotificationType;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use App\Service\Identity\ProfileDeleter;
use App\Service\Identity\ProfileDeletionBlocked;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

final class ProfileDeletionTest extends DatabaseTestCase
{
    private ProfileDeleter $deleter;
    private Profile $rafael;
    private Profile $lea;
    private Profile $thomas;

    protected function setUp(): void
    {
        parent::setUp();
        $this->deleter = new ProfileDeleter($this->em);
        $this->rafael = $this->profile('rafael');
        $this->lea = $this->child('lea', $this->rafael);
        $this->thomas = $this->profile('thomas');
    }

    private function rows(string $sql): int
    {
        return (int) $this->fetchOne($sql);
    }

    public function testChildDeletionFollowsTheMddTable(): void
    {
        [$rafael, $lea, $thomas] = [$this->rafael, $this->lea, $this->thomas];
        $ghost = Profile::GHOST_ID;

        // Les biens de Léa, chez elle et chez Rafael.
        $rafaelHome = (new Place($rafael, 'Maison'))->setIsPrimary(true);
        $leaPlace = (new Place($lea, 'Chambre de Léa'))->setIsPrimary(true);
        $leaRoom = new Room($leaPlace, 'Chambre');
        $leaCategory = new ItemCategory('Jeux', $lea);
        $rafaelCategory = new ItemCategory('Jeux', $rafael);
        $console = new Item($lea, 'Console', $leaRoom, $leaCategory);
        $robe = new Garment($lea, 'Robe', $leaRoom, $this->garmentCategory('enfant-robes'));
        $photo = new Media($lea, 'lea/console.jpg', 'image/jpeg', 10);
        $board = new Collection($lea, 'Mes jouets');
        $outfit = (new Outfit($lea, 'École'))->addGarment($robe);
        $this->persist($rafaelHome, $leaPlace, $leaRoom, $leaCategory, $rafaelCategory, $console, $robe, $photo, $board, $outfit);

        // Ce qui implique des tiers.
        $livre = new Item($thomas, 'Livre', $this->room($thomas));
        $returned = Loan::offer($livre, $lea);
        $returned->markReceived($lea);
        $this->persist($livre, $returned);
        $returned->confirmReturn($thomas);
        $pending = Loan::request($console, $thomas);
        $share = new ItemShare($lea, $console, ShareAudience::Specific, AccessLevel::Read);
        $share->addRecipient($thomas);
        $comment = new ItemComment($lea, $console, 'Ma console !');
        $answer = new ItemComment($thomas, $console, 'Trop bien', $share, $comment);
        $post = new Post($lea, 'Ma collection', ShareAudience::Friends, true, $board);
        $listing = new Listing($console, '10.00');
        $this->persist($pending, $share, ...$share->getRecipients()->toArray());
        $this->persist($comment, $answer, $post, $listing);

        // Ce qui n'a de sens que pour elle.
        $friendship = (new Friendship($lea, $thomas))->accept();
        $this->persist(
            $friendship,
            new Follow($lea, $thomas),
            new ProfilePermission($lea, Permission::ShareCreate, PermissionMode::Allowed, $rafael),
            new ApprovalRequest($lea, Permission::FriendAdd),
            new WearLog($robe, $lea),
            new ColorPreference($lea, $this->color('Rose'), Sentiment::Like),
            new GarmentVisibilityPreference($lea, null, $this->color('Noir')),
            new Notification($lea, NotificationType::FriendAccepted, 'Thomas a accepté', null, [], $thomas),
        );
        $leaId = $lea->getId()->toRfc4122();
        $r = $rafael->getId()->toRfc4122();

        $this->deleter->deleteChild($lea, $rafael);

        self::assertSame(0, $this->rows("SELECT count(*) FROM profile WHERE id = '$leaId'"), 'la ligne du profil est réellement supprimée');

        // Au tuteur.
        foreach (['item', 'garment', 'media', 'collection', 'outfit'] as $table) {
            self::assertSame(0, $this->rows("SELECT count(*) FROM $table WHERE owner_id = '$leaId'"), "$table transféré");
        }
        self::assertSame($r, $this->fetchOne("SELECT owner_id FROM place WHERE id = '{$leaPlace->getId()}'"));
        self::assertFalse((bool) $this->fetchOne("SELECT is_primary FROM place WHERE id = '{$leaPlace->getId()}'"), 'le tuteur garde sa seule résidence principale');
        self::assertSame(0, $this->rows("SELECT count(*) FROM item_category WHERE id = '{$leaCategory->getId()}'"), 'catégories de même slug fusionnées');
        self::assertSame($rafaelCategory->getId()->toRfc4122(), $this->fetchOne("SELECT category_id FROM item WHERE id = '{$console->getId()}'"));

        // Révoqué.
        self::assertNotNull($this->fetchOne("SELECT revoked_at FROM share WHERE id = '{$share->getId()}'"));
        self::assertSame(1, $this->rows("SELECT count(*) FROM share_recipient WHERE share_id = '{$share->getId()}'"), 'le destinataire (Thomas) reste inscrit au partage révoqué');

        // Au fantôme, sans casser ce qui concerne les autres.
        self::assertSame($ghost, $this->fetchOne("SELECT borrower_id FROM loan WHERE id = '{$returned->getId()}'"), 'prêt terminé conservé');
        self::assertSame(0, $this->rows("SELECT count(*) FROM loan_event WHERE actor_id = '$leaId'"));
        self::assertSame(LoanStatus::Cancelled->value, $this->fetchOne("SELECT status FROM loan WHERE id = '{$pending->getId()}'"), 'prêt en attente annulé');
        self::assertSame($ghost, $this->fetchOne("SELECT author_id FROM comment WHERE id = '{$comment->getId()}'"));
        self::assertSame(1, $this->rows("SELECT count(*) FROM comment WHERE id = '{$answer->getId()}' AND parent_id = '{$comment->getId()}'"), 'la réponse de Thomas garde son fil');
        self::assertNotNull($this->fetchOne("SELECT deleted_at FROM post WHERE id = '{$post->getId()}'"));
        self::assertSame('WITHDRAWN', $this->fetchOne("SELECT status FROM listing WHERE id = '{$listing->getId()}'"));
        self::assertSame($ghost, $this->fetchOne("SELECT seller_id FROM listing WHERE id = '{$listing->getId()}'"));

        // Parti avec elle.
        foreach (['friendship' => 'requester_id', 'follow' => 'follower_id', 'profile_permission' => 'profile_id', 'approval_request' => 'requester_id', 'wear_log' => 'profile_id', 'color_preference' => 'profile_id', 'garment_visibility_preference' => 'profile_id', 'notification' => 'recipient_id'] as $table => $column) {
            self::assertSame(0, $this->rows("SELECT count(*) FROM $table WHERE $column = '$leaId'"), "$table supprimé");
        }
    }

    public function testActiveLoanBlocksDeletion(): void
    {
        $toy = new Item($this->lea, 'Trottinette', $this->room($this->lea));
        $loan = Loan::offer($toy, $this->thomas);
        $loan->markReceived($this->thomas);
        $this->persist($toy, $loan);

        $this->expectException(ProfileDeletionBlocked::class);
        $this->deleter->deleteChild($this->lea, $this->rafael);
    }

    public function testOnlyTheGuardianDeletesAChild(): void
    {
        $this->expectException(AccessDeniedException::class);
        $this->deleter->deleteChild($this->lea, $this->thomas);
    }

    public function testAdultAndGhostDeletionAreNotDefined(): void
    {
        foreach ([[$this->thomas, $this->thomas], [$this->ghost(), $this->rafael]] as [$target, $actor]) {
            try {
                $this->deleter->deleteChild($target, $actor);
                self::fail('Suppression non définie acceptée.');
            } catch (\LogicException) {
                $this->addToAssertionCount(1);
            }
        }
    }
}
