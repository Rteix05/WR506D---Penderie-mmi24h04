<?php

namespace App\Tests\Integration;

use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Media\Media;
use App\Entity\Place\Room;
use App\Entity\Sharing\BoxShare;
use App\Entity\Sharing\Collection;
use App\Entity\Sharing\CollectionComment;
use App\Entity\Sharing\CollectionEntry;
use App\Entity\Sharing\CollectionShare;
use App\Entity\Sharing\GarmentComment;
use App\Entity\Sharing\ItemComment;
use App\Entity\Sharing\ItemShare;
use App\Entity\Sharing\Post;
use App\Entity\Sharing\PostComment;
use App\Entity\Sharing\RoomShare;
use App\Entity\Sharing\Share;
use App\Entity\Place\Box;
use App\Enum\Sharing\AccessLevel as A;
use App\Enum\Sharing\CollectionLayout;
use App\Enum\Sharing\ShareAudience as Au;

final class SharingTest extends DatabaseTestCase
{
    private function expectLogic(callable $fn): void
    {
        try {
            $fn();
            self::fail('Opération interdite acceptée.');
        } catch (\LogicException) {
            $this->addToAssertionCount(1);
        }
    }

    public function testShareRules(): void
    {
        $rafael = $this->profile('rafael');
        $thomas = $this->profile('thomas');
        $room = $this->room($rafael);
        $perceuse = new Item($rafael, 'Perceuse', $room);

        $share = new ItemShare($rafael, $perceuse, Au::Specific, A::Comment);
        $recipient = $share->addRecipient($thomas);
        self::assertSame($recipient, $share->addRecipient($thomas), 'destinataire ajouté une seule fois');
        $this->expectLogic(fn () => $share->addRecipient($rafael));
        $this->expectLogic(fn () => new ItemShare($rafael, $perceuse, Au::Followers, A::Comment));
        $this->expectLogic(fn () => new ItemShare($thomas, $perceuse, Au::Friends));
        $this->expectLogic(fn () => (new ItemShare($rafael, $perceuse, Au::Friends))->addRecipient($thomas));

        $link = new RoomShare($rafael, $room, Au::Link);
        self::assertSame(43, \strlen((string) $link->getToken()));
        self::assertNull($share->getToken());
        $this->persist($perceuse, $share, $recipient, $link);

        $this->em->clear();
        $reloaded = $this->em->find(Share::class, $link->getId());
        self::assertInstanceOf(RoomShare::class, $reloaded, 'relu depuis la table unique : le bon sous-type');
        self::assertFalse($reloaded->setExpiresAt(new \DateTimeImmutable('-1 day'))->isActive());
    }

    public function testCommentRules(): void
    {
        $rafael = $this->profile('rafael');
        $thomas = $this->profile('thomas');
        $marie = $this->profile('marie');
        $room = $this->room($rafael);
        $perceuse = new Item($rafael, 'Perceuse', $room);
        $veste = new Garment($rafael, 'Veste', $room, $this->garmentCategory('vestes'));
        $canWrite = new ItemShare($rafael, $perceuse, Au::Specific, A::Comment);
        $canRead = new ItemShare($rafael, $perceuse, Au::Friends, A::ViewComments);
        $this->persist($perceuse, $veste, $canWrite, $canRead);

        $c1 = new ItemComment($thomas, $perceuse, 'Tu me la prêtes ?', $canWrite);
        $c2 = new ItemComment($rafael, $perceuse, 'Oui.', null, $c1);
        $this->persist($c1, $c2);
        self::assertSame($c1, $c2->getParent());

        $this->expectLogic(fn () => new ItemComment($marie, $perceuse, 'Moi aussi', $canRead));
        $this->expectLogic(fn () => new GarmentComment($thomas, $veste, 'Égarée', null, $c1));
        $canWrite->revoke();
        $this->expectLogic(fn () => new ItemComment($thomas, $perceuse, 'Encore', $canWrite));
        self::assertFalse($c1->hide()->isVisible());
    }

    public function testPublishingACollectionCreatesItsShare(): void
    {
        $rafael = $this->profile('rafael');
        $thomas = $this->profile('thomas');
        $board = (new Collection($rafael, 'Été', CollectionLayout::Moodboard))->setBackgroundColor('#f4efe6');
        $inspi = new Media($rafael, 'boards/plage.jpg', 'image/jpeg', 10);
        CollectionEntry::forMedia($board, $inspi);
        $text = CollectionEntry::text($board, 'Tons sable');
        $this->persist($board, $inspi, ...$board->getEntries()->toArray());
        self::assertSame('#F4EFE6', $board->getBackgroundColor());
        self::assertSame(1, $text->getPosition());

        $post = new Post($rafael, 'Vos avis ?', Au::Friends, true, $board);
        $this->persist($post);
        self::assertInstanceOf(CollectionShare::class, $post->getShare());
        self::assertSame(A::Comment, $post->getShare()->getAccessLevel());
        self::assertSame($board, $post->getFeatured(), 'la ressource est la cible du partage de la publication');

        $comment = new PostComment($thomas, $post, 'Trop bien');
        self::assertSame($post->getShare(), $comment->getShare());

        $post->softDelete();
        self::assertNotNull($post->getShare()->getRevokedAt(), 'supprimer la publication révoque son partage');
    }

    public function testPostAudienceRules(): void
    {
        $rafael = $this->profile('rafael');
        $followers = new Post($rafael, 'Nouveau dressing', Au::Followers, true);
        self::assertFalse($followers->isCommentsEnabled());

        $this->expectLogic(fn () => new PostComment($this->profile('thomas'), $followers, 'Joli'));
        $this->expectLogic(fn () => new Post($rafael, 'Pour vous', Au::Specific));
        $this->expectLogic(fn () => new Post($rafael, 'Lien', Au::Link));
    }

    public function testDeletingAPublishedCollection(): void
    {
        $rafael = $this->profile('rafael');
        $veste = new Garment($rafael, 'Veste', $this->room($rafael), $this->garmentCategory('vestes'));
        $board = new Collection($rafael, 'Été');
        $entry = CollectionEntry::forGarment($board, $veste);
        $post = new Post($rafael, 'Regardez', Au::Friends, true, $board);
        $this->persist($veste, $board, $entry, $post, new CollectionComment($this->profile('thomas'), $board, 'Belle palette'));

        $this->conn->executeStatement("DELETE FROM collection WHERE id = '{$board->getId()}'");

        self::assertSame(0, (int) $this->fetchOne('SELECT count(*) FROM collection_entry'));
        self::assertSame(0, (int) $this->fetchOne("SELECT count(*) FROM share WHERE target_type = 'COLLECTION'"));
        self::assertSame(0, (int) $this->fetchOne("SELECT count(*) FROM comment WHERE target_type = 'COLLECTION'"));
        self::assertNull($this->fetchOne("SELECT share_id FROM post WHERE id = '{$post->getId()}'"), 'la publication reste, sans ressource');
        self::assertSame(1, (int) $this->fetchOne("SELECT count(*) FROM garment WHERE id = '{$veste->getId()}'"));
    }

    public function testDatabaseGuardsSharing(): void
    {
        $rafael = $this->profile('rafael');
        $room = $this->room($rafael);
        $box = new Box($room, 'Carton');
        $perceuse = new Item($rafael, 'Perceuse', $room);
        $veste = new Garment($rafael, 'Veste', $room, $this->garmentCategory('vestes'));
        $followers = new BoxShare($rafael, $box, Au::Followers);
        $link = new RoomShare($rafael, $room, Au::Link);
        $itemShare = new ItemShare($rafael, $perceuse, Au::Friends);
        $board = new Collection($rafael, 'Été');
        $text = CollectionEntry::text($board, 'Texte');
        $post = new Post($rafael, 'Abonnés', Au::Followers);
        $this->persist($box, $perceuse, $veste, $followers, $link, $itemShare, $board, $text, $post);

        $this->assertDbRejects("UPDATE share SET access_level = 'COMMENT' WHERE id = '{$followers->getId()}'", 'chk_share_read_only_audience');
        $this->assertDbRejects("UPDATE share SET token = NULL WHERE id = '{$link->getId()}'", 'chk_share_link_token');
        $this->assertDbRejects("UPDATE share SET garment_id = '{$veste->getId()}' WHERE id = '{$itemShare->getId()}'", 'chk_share_target_garment_id');
        $this->assertDbRejects("UPDATE post SET comments_enabled = true WHERE id = '{$post->getId()}'", 'chk_post_followers_no_comments');
        $this->assertDbRejects("UPDATE post SET audience = 'LINK'", 'chk_post_audience');
        $this->assertDbRejects("UPDATE collection_entry SET caption = '' WHERE id = '{$text->getId()}'", 'chk_collection_entry_text');
    }
}
