<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Domaine « Partage & collections » du MDD V2 : Share (5 sous-types) et
 * ShareRecipient, Comment (4 sous-types ; ListingComment viendra avec la
 * vente), Post et PostMedia, Collection et CollectionEntry.
 *
 * SQL des tables généré par doctrine:migrations:diff, complété à la main
 * par les CHECK, dont les deux qui portent le modèle :
 *  - héritage SINGLE_TABLE : une ligne ne remplit que la colonne de cible
 *    de son discriminant (target_type) ;
 *  - un abonné ou un visiteur par lien ne voit ni n'écrit jamais de
 *    commentaire (share et post).
 *
 * Post ne pointe sa ressource que via son partage (post.share_id), sans
 * colonnes collection · item · garment : voir Post.
 */
final class Version20260929191244 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Partage : share, share_recipient, comment, post, post_media, collection, collection_entry';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE collection (id UUID NOT NULL, name VARCHAR(120) NOT NULL, description TEXT DEFAULT NULL, layout VARCHAR(20) NOT NULL, visibility VARCHAR(20) NOT NULL, background_color VARCHAR(7) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, owner_id UUID NOT NULL, cover_media_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_collection_owner ON collection (owner_id)');
        $this->addSql('CREATE INDEX IDX_FC4D6532329A1B2E ON collection (cover_media_id)');
        $this->addSql('CREATE TABLE collection_entry (id UUID NOT NULL, kind VARCHAR(20) NOT NULL, caption TEXT DEFAULT NULL, position_x INT DEFAULT NULL, position_y INT DEFAULT NULL, width INT DEFAULT NULL, height INT DEFAULT NULL, rotation SMALLINT DEFAULT NULL, z_index INT NOT NULL, position INT NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, collection_id UUID NOT NULL, item_id UUID DEFAULT NULL, garment_id UUID DEFAULT NULL, media_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_collection_entry_z ON collection_entry (collection_id, z_index)');
        $this->addSql('CREATE INDEX IDX_6CD92523514956FD ON collection_entry (collection_id)');
        $this->addSql('CREATE INDEX IDX_6CD92523126F525E ON collection_entry (item_id)');
        $this->addSql('CREATE INDEX IDX_6CD925239CDB257C ON collection_entry (garment_id)');
        $this->addSql('CREATE INDEX IDX_6CD92523EA9FDD75 ON collection_entry (media_id)');
        $this->addSql('CREATE TABLE comment (id UUID NOT NULL, body TEXT NOT NULL, deleted_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, hidden_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, author_id UUID NOT NULL, share_id UUID DEFAULT NULL, parent_id UUID DEFAULT NULL, target_type VARCHAR(20) NOT NULL, item_id UUID DEFAULT NULL, garment_id UUID DEFAULT NULL, collection_id UUID DEFAULT NULL, post_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_comment_share ON comment (share_id)');
        $this->addSql('CREATE INDEX IDX_9474526CF675F31B ON comment (author_id)');
        $this->addSql('CREATE INDEX IDX_9474526C727ACA70 ON comment (parent_id)');
        $this->addSql('CREATE INDEX IDX_9474526C126F525E ON comment (item_id)');
        $this->addSql('CREATE INDEX IDX_9474526C9CDB257C ON comment (garment_id)');
        $this->addSql('CREATE INDEX IDX_9474526C514956FD ON comment (collection_id)');
        $this->addSql('CREATE INDEX IDX_9474526C4B89032C ON comment (post_id)');
        $this->addSql('CREATE TABLE post (id UUID NOT NULL, body TEXT DEFAULT NULL, audience VARCHAR(20) NOT NULL, published_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, deleted_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, comments_enabled BOOLEAN NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, author_id UUID NOT NULL, share_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_5A8A6C8D2AE63FDB ON post (share_id)');
        $this->addSql('CREATE INDEX idx_post_author_published ON post (author_id, published_at)');
        $this->addSql('CREATE INDEX idx_post_published ON post (published_at)');
        $this->addSql('CREATE INDEX IDX_5A8A6C8DF675F31B ON post (author_id)');
        $this->addSql('CREATE TABLE post_media (position INT NOT NULL, post_id UUID NOT NULL, media_id UUID NOT NULL, PRIMARY KEY (post_id, media_id))');
        $this->addSql('CREATE INDEX idx_post_media_order ON post_media (post_id, position)');
        $this->addSql('CREATE INDEX IDX_FD372DE34B89032C ON post_media (post_id)');
        $this->addSql('CREATE INDEX IDX_FD372DE3EA9FDD75 ON post_media (media_id)');
        $this->addSql('CREATE TABLE share (id UUID NOT NULL, audience VARCHAR(20) NOT NULL, access_level VARCHAR(20) NOT NULL, token VARCHAR(64) DEFAULT NULL, expires_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, revoked_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, view_count INT NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, owner_id UUID NOT NULL, target_type VARCHAR(20) NOT NULL, item_id UUID DEFAULT NULL, garment_id UUID DEFAULT NULL, room_id UUID DEFAULT NULL, box_id UUID DEFAULT NULL, collection_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_EF069D5A5F37A13B ON share (token)');
        $this->addSql('CREATE INDEX idx_share_owner_revoked ON share (owner_id, revoked_at)');
        $this->addSql('CREATE INDEX IDX_EF069D5A7E3C61F9 ON share (owner_id)');
        $this->addSql('CREATE INDEX IDX_EF069D5A126F525E ON share (item_id)');
        $this->addSql('CREATE INDEX IDX_EF069D5A9CDB257C ON share (garment_id)');
        $this->addSql('CREATE INDEX IDX_EF069D5A54177093 ON share (room_id)');
        $this->addSql('CREATE INDEX IDX_EF069D5AD8177B3F ON share (box_id)');
        $this->addSql('CREATE INDEX IDX_EF069D5A514956FD ON share (collection_id)');
        $this->addSql('CREATE TABLE share_recipient (id UUID NOT NULL, added_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, last_viewed_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, share_id UUID NOT NULL, profile_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_share_recipient_profile ON share_recipient (profile_id)');
        $this->addSql('CREATE UNIQUE INDEX uniq_share_recipient ON share_recipient (share_id, profile_id)');
        $this->addSql('CREATE INDEX IDX_83F336C52AE63FDB ON share_recipient (share_id)');
        $this->addSql('ALTER TABLE collection ADD CONSTRAINT FK_FC4D65327E3C61F9 FOREIGN KEY (owner_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE collection ADD CONSTRAINT FK_FC4D6532329A1B2E FOREIGN KEY (cover_media_id) REFERENCES media (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE collection_entry ADD CONSTRAINT FK_6CD92523514956FD FOREIGN KEY (collection_id) REFERENCES collection (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE collection_entry ADD CONSTRAINT FK_6CD92523126F525E FOREIGN KEY (item_id) REFERENCES item (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE collection_entry ADD CONSTRAINT FK_6CD925239CDB257C FOREIGN KEY (garment_id) REFERENCES garment (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE collection_entry ADD CONSTRAINT FK_6CD92523EA9FDD75 FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE comment ADD CONSTRAINT FK_9474526CF675F31B FOREIGN KEY (author_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE comment ADD CONSTRAINT FK_9474526C2AE63FDB FOREIGN KEY (share_id) REFERENCES share (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE comment ADD CONSTRAINT FK_9474526C727ACA70 FOREIGN KEY (parent_id) REFERENCES comment (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE comment ADD CONSTRAINT FK_9474526C126F525E FOREIGN KEY (item_id) REFERENCES item (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE comment ADD CONSTRAINT FK_9474526C9CDB257C FOREIGN KEY (garment_id) REFERENCES garment (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE comment ADD CONSTRAINT FK_9474526C514956FD FOREIGN KEY (collection_id) REFERENCES collection (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE comment ADD CONSTRAINT FK_9474526C4B89032C FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE post ADD CONSTRAINT FK_5A8A6C8DF675F31B FOREIGN KEY (author_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE post ADD CONSTRAINT FK_5A8A6C8D2AE63FDB FOREIGN KEY (share_id) REFERENCES share (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE post_media ADD CONSTRAINT FK_FD372DE34B89032C FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE post_media ADD CONSTRAINT FK_FD372DE3EA9FDD75 FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE share ADD CONSTRAINT FK_EF069D5A7E3C61F9 FOREIGN KEY (owner_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE share ADD CONSTRAINT FK_EF069D5A126F525E FOREIGN KEY (item_id) REFERENCES item (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE share ADD CONSTRAINT FK_EF069D5A9CDB257C FOREIGN KEY (garment_id) REFERENCES garment (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE share ADD CONSTRAINT FK_EF069D5A54177093 FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE share ADD CONSTRAINT FK_EF069D5AD8177B3F FOREIGN KEY (box_id) REFERENCES box (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE share ADD CONSTRAINT FK_EF069D5A514956FD FOREIGN KEY (collection_id) REFERENCES collection (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE share_recipient ADD CONSTRAINT FK_83F336C52AE63FDB FOREIGN KEY (share_id) REFERENCES share (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE share_recipient ADD CONSTRAINT FK_83F336C5CCFA12B8 FOREIGN KEY (profile_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');

        // --- Share ------------------------------------------------------------------
        $shareTargets = ['ITEM' => 'item_id', 'GARMENT' => 'garment_id', 'ROOM' => 'room_id', 'BOX' => 'box_id', 'COLLECTION' => 'collection_id'];
        $this->addSql("ALTER TABLE share ADD CONSTRAINT chk_share_target_type CHECK (target_type IN ('".implode("', '", array_keys($shareTargets))."'))");
        foreach ($shareTargets as $type => $column) {
            // La colonne de cible est remplie si et seulement si c'est celle du sous-type.
            $this->addSql("ALTER TABLE share ADD CONSTRAINT chk_share_target_{$column} CHECK ((target_type = '$type') = ($column IS NOT NULL))");
        }
        $this->addSql("ALTER TABLE share ADD CONSTRAINT chk_share_audience CHECK (audience IN ('SPECIFIC', 'FRIENDS', 'FOLLOWERS', 'LINK'))");
        $this->addSql("ALTER TABLE share ADD CONSTRAINT chk_share_access_level CHECK (access_level IN ('VIEW', 'VIEW_COMMENTS', 'COMMENT'))");
        // Abonnés et lien : lecture seule, jamais de commentaire (MDD, révision du 15/09).
        $this->addSql("ALTER TABLE share ADD CONSTRAINT chk_share_read_only_audience CHECK (audience IN ('FRIENDS', 'SPECIFIC') OR access_level = 'VIEW')");
        // Un jeton de lien existe si et seulement si l'audience est LINK.
        $this->addSql("ALTER TABLE share ADD CONSTRAINT chk_share_link_token CHECK ((audience = 'LINK') = (token IS NOT NULL))");
        $this->addSql('ALTER TABLE share ADD CONSTRAINT chk_share_view_count CHECK (view_count >= 0)');

        // --- Comment ----------------------------------------------------------------
        $commentTargets = ['ITEM' => 'item_id', 'GARMENT' => 'garment_id', 'COLLECTION' => 'collection_id', 'POST' => 'post_id'];
        $this->addSql("ALTER TABLE comment ADD CONSTRAINT chk_comment_target_type CHECK (target_type IN ('".implode("', '", array_keys($commentTargets))."'))");
        foreach ($commentTargets as $type => $column) {
            $this->addSql("ALTER TABLE comment ADD CONSTRAINT chk_comment_target_{$column} CHECK ((target_type = '$type') = ($column IS NOT NULL))");
        }
        $this->addSql('ALTER TABLE comment ADD CONSTRAINT chk_comment_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id)');

        // --- Post -------------------------------------------------------------------
        $this->addSql("ALTER TABLE post ADD CONSTRAINT chk_post_audience CHECK (audience IN ('SPECIFIC', 'FRIENDS', 'FOLLOWERS'))");
        // Un abonné ne commente jamais : une publication aux abonnés ferme ses commentaires.
        $this->addSql("ALTER TABLE post ADD CONSTRAINT chk_post_followers_no_comments CHECK (audience <> 'FOLLOWERS' OR comments_enabled = false)");
        $this->addSql('ALTER TABLE post_media ADD CONSTRAINT chk_post_media_position CHECK (position >= 0)');

        // --- Collection ---------------------------------------------------------------
        $this->addSql("ALTER TABLE collection ADD CONSTRAINT chk_collection_layout CHECK (layout IN ('LIST', 'MOODBOARD'))");
        $this->addSql("ALTER TABLE collection ADD CONSTRAINT chk_collection_visibility CHECK (visibility IN ('PRIVATE', 'SHARED', 'LINK'))");
        $this->addSql("ALTER TABLE collection ADD CONSTRAINT chk_collection_background CHECK (background_color IS NULL OR background_color ~ '^#[0-9A-F]{6}$')");

        // --- CollectionEntry ------------------------------------------------------------
        $this->addSql("ALTER TABLE collection_entry ADD CONSTRAINT chk_collection_entry_kind CHECK (kind IN ('ITEM', 'GARMENT', 'MEDIA', 'TEXT'))");
        foreach (['ITEM' => 'item_id', 'GARMENT' => 'garment_id', 'MEDIA' => 'media_id'] as $kind => $column) {
            // « Exactement un selon kind, aucun si TEXT » (MDD).
            $this->addSql("ALTER TABLE collection_entry ADD CONSTRAINT chk_collection_entry_{$column} CHECK ((kind = '$kind') = ($column IS NOT NULL))");
        }
        $this->addSql("ALTER TABLE collection_entry ADD CONSTRAINT chk_collection_entry_text CHECK (kind <> 'TEXT' OR (caption IS NOT NULL AND btrim(caption) <> ''))");
        $this->addSql('ALTER TABLE collection_entry ADD CONSTRAINT chk_collection_entry_rotation CHECK (rotation IS NULL OR rotation BETWEEN -360 AND 360)');
        $this->addSql('ALTER TABLE collection_entry ADD CONSTRAINT chk_collection_entry_size CHECK ((width IS NULL OR width > 0) AND (height IS NULL OR height > 0))');
        $this->addSql('ALTER TABLE collection_entry ADD CONSTRAINT chk_collection_entry_position CHECK (position >= 0)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE collection DROP CONSTRAINT FK_FC4D65327E3C61F9');
        $this->addSql('ALTER TABLE collection DROP CONSTRAINT FK_FC4D6532329A1B2E');
        $this->addSql('ALTER TABLE collection_entry DROP CONSTRAINT FK_6CD92523514956FD');
        $this->addSql('ALTER TABLE collection_entry DROP CONSTRAINT FK_6CD92523126F525E');
        $this->addSql('ALTER TABLE collection_entry DROP CONSTRAINT FK_6CD925239CDB257C');
        $this->addSql('ALTER TABLE collection_entry DROP CONSTRAINT FK_6CD92523EA9FDD75');
        $this->addSql('ALTER TABLE comment DROP CONSTRAINT FK_9474526CF675F31B');
        $this->addSql('ALTER TABLE comment DROP CONSTRAINT FK_9474526C2AE63FDB');
        $this->addSql('ALTER TABLE comment DROP CONSTRAINT FK_9474526C727ACA70');
        $this->addSql('ALTER TABLE comment DROP CONSTRAINT FK_9474526C126F525E');
        $this->addSql('ALTER TABLE comment DROP CONSTRAINT FK_9474526C9CDB257C');
        $this->addSql('ALTER TABLE comment DROP CONSTRAINT FK_9474526C514956FD');
        $this->addSql('ALTER TABLE comment DROP CONSTRAINT FK_9474526C4B89032C');
        $this->addSql('ALTER TABLE post DROP CONSTRAINT FK_5A8A6C8DF675F31B');
        $this->addSql('ALTER TABLE post DROP CONSTRAINT FK_5A8A6C8D2AE63FDB');
        $this->addSql('ALTER TABLE post_media DROP CONSTRAINT FK_FD372DE34B89032C');
        $this->addSql('ALTER TABLE post_media DROP CONSTRAINT FK_FD372DE3EA9FDD75');
        $this->addSql('ALTER TABLE share DROP CONSTRAINT FK_EF069D5A7E3C61F9');
        $this->addSql('ALTER TABLE share DROP CONSTRAINT FK_EF069D5A126F525E');
        $this->addSql('ALTER TABLE share DROP CONSTRAINT FK_EF069D5A9CDB257C');
        $this->addSql('ALTER TABLE share DROP CONSTRAINT FK_EF069D5A54177093');
        $this->addSql('ALTER TABLE share DROP CONSTRAINT FK_EF069D5AD8177B3F');
        $this->addSql('ALTER TABLE share DROP CONSTRAINT FK_EF069D5A514956FD');
        $this->addSql('ALTER TABLE share_recipient DROP CONSTRAINT FK_83F336C52AE63FDB');
        $this->addSql('ALTER TABLE share_recipient DROP CONSTRAINT FK_83F336C5CCFA12B8');
        $this->addSql('DROP TABLE collection');
        $this->addSql('DROP TABLE collection_entry');
        $this->addSql('DROP TABLE comment');
        $this->addSql('DROP TABLE post');
        $this->addSql('DROP TABLE post_media');
        $this->addSql('DROP TABLE share');
        $this->addSql('DROP TABLE share_recipient');
    }
}
