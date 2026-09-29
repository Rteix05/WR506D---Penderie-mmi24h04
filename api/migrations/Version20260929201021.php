<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Domaine « Notifications & modération » du MDD V2 : Notification,
 * NotificationPreference, DeviceToken, ModerationAction. Report reste en
 * V2 : la clé moderation_action.report_id arrivera avec lui.
 * RefreshToken sera créée par le bundle JWT, dans sa propre feature.
 *
 * SQL des tables généré par doctrine:migrations:diff, complété à la main :
 *  - les CHECK (énumérations, action compatible avec sa cible, expiration
 *    réservée aux suspensions et bannissements) ;
 *  - l'écriture seule de moderation_action (sauf admin_id, pour la
 *    réaffectation au compte fantôme), par le déclencheur de garde.
 */
final class Version20260929201021 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Notifications & modération : notification, notification_preference, device_token, moderation_action';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE device_token (id UUID NOT NULL, token VARCHAR(255) NOT NULL, platform VARCHAR(10) NOT NULL, last_seen_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, account_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_99B2415C5F37A13B ON device_token (token)');
        $this->addSql('CREATE INDEX idx_device_token_account ON device_token (account_id)');
        $this->addSql('CREATE TABLE moderation_action (id UUID NOT NULL, action_type VARCHAR(30) NOT NULL, target_type VARCHAR(20) NOT NULL, target_id UUID NOT NULL, reason TEXT NOT NULL, expires_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, admin_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_moderation_action_target ON moderation_action (target_type, target_id)');
        $this->addSql('CREATE INDEX idx_moderation_action_admin ON moderation_action (admin_id, created_at)');
        $this->addSql('CREATE INDEX IDX_B05D8128642B8210 ON moderation_action (admin_id)');
        $this->addSql('CREATE TABLE notification (id UUID NOT NULL, type VARCHAR(30) NOT NULL, title VARCHAR(150) NOT NULL, body TEXT DEFAULT NULL, data JSONB NOT NULL, read_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, push_sent_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, email_sent_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, recipient_id UUID NOT NULL, actor_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_notification_recipient_read_created ON notification (recipient_id, read_at, created_at)');
        $this->addSql('CREATE INDEX IDX_BF5476CAE92F8F78 ON notification (recipient_id)');
        $this->addSql('CREATE INDEX IDX_BF5476CA10DAF24A ON notification (actor_id)');
        $this->addSql('CREATE TABLE notification_preference (id UUID NOT NULL, type VARCHAR(30) NOT NULL, push_enabled BOOLEAN NOT NULL, email_enabled BOOLEAN NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, profile_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX uniq_notification_preference ON notification_preference (profile_id, type)');
        $this->addSql('CREATE INDEX IDX_A61B1571CCFA12B8 ON notification_preference (profile_id)');
        $this->addSql('ALTER TABLE device_token ADD CONSTRAINT FK_99B2415C9B6B5FBA FOREIGN KEY (account_id) REFERENCES account (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE moderation_action ADD CONSTRAINT FK_B05D8128642B8210 FOREIGN KEY (admin_id) REFERENCES account (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE notification ADD CONSTRAINT FK_BF5476CAE92F8F78 FOREIGN KEY (recipient_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE notification ADD CONSTRAINT FK_BF5476CA10DAF24A FOREIGN KEY (actor_id) REFERENCES profile (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE notification_preference ADD CONSTRAINT FK_A61B1571CCFA12B8 FOREIGN KEY (profile_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');

        // --- Notification ------------------------------------------------------------------
        $types = "'FOLLOW_NEW', 'FOLLOW_MUTUAL', 'FRIEND_REQUEST', 'FRIEND_ACCEPTED', 'LOAN_REQUESTED', 'LOAN_ACCEPTED', 'LOAN_DUE_SOON', 'LOAN_OVERDUE', 'LOAN_RETURNED', 'ITEM_LOST', 'LISTING_SOLD', 'ORDER_PAID', 'ORDER_SHIPPED', 'REFUND_ISSUED', 'COMMENT_ADDED', 'SHARE_RECEIVED', 'APPROVAL_REQUESTED', 'APPROVAL_DECIDED', 'MODERATION_ACTION'";
        $this->addSql("ALTER TABLE notification ADD CONSTRAINT chk_notification_type CHECK (type IN ($types))");
        $this->addSql("ALTER TABLE notification_preference ADD CONSTRAINT chk_notification_preference_type CHECK (type IN ($types))");
        $this->addSql('ALTER TABLE notification ADD CONSTRAINT chk_notification_not_self CHECK (actor_id IS NULL OR actor_id <> recipient_id)');

        // --- DeviceToken ---------------------------------------------------------------------
        $this->addSql("ALTER TABLE device_token ADD CONSTRAINT chk_device_token_platform CHECK (platform IN ('IOS', 'ANDROID'))");

        // --- ModerationAction ------------------------------------------------------------------
        $this->addSql("ALTER TABLE moderation_action ADD CONSTRAINT chk_moderation_action_type CHECK (action_type IN ('HIDE_CONTENT', 'DELETE_CONTENT', 'WARN', 'SUSPEND_PROFILE', 'BAN_ACCOUNT', 'RESTORE'))");
        $this->addSql("ALTER TABLE moderation_action ADD CONSTRAINT chk_moderation_action_target_type CHECK (target_type IN ('ACCOUNT', 'PROFILE', 'ITEM', 'GARMENT', 'COMMENT', 'LISTING', 'COLLECTION', 'POST'))");
        // L'action correspond à sa cible : on suspend ou avertit un profil, on bannit un
        // compte, on masque ou supprime un contenu ; RESTORE vise n'importe quoi.
        $this->addSql(<<<'SQL'
            ALTER TABLE moderation_action ADD CONSTRAINT chk_moderation_action_target CHECK (
                   (action_type IN ('SUSPEND_PROFILE', 'WARN') AND target_type = 'PROFILE')
                OR (action_type = 'BAN_ACCOUNT' AND target_type = 'ACCOUNT')
                OR (action_type IN ('HIDE_CONTENT', 'DELETE_CONTENT') AND target_type NOT IN ('ACCOUNT', 'PROFILE'))
                OR action_type = 'RESTORE'
            )
            SQL);
        // Seules une suspension et un bannissement peuvent être temporaires.
        $this->addSql("ALTER TABLE moderation_action ADD CONSTRAINT chk_moderation_action_expires CHECK (expires_at IS NULL OR action_type IN ('SUSPEND_PROFILE', 'BAN_ACCOUNT'))");
        // Journal en écriture seule (MDD) ; admin_id reste modifiable pour le compte fantôme.
        $this->addSql("CREATE TRIGGER trg_moderation_action_append_only BEFORE UPDATE OR DELETE ON moderation_action FOR EACH ROW EXECUTE FUNCTION penderie_append_only('admin_id')");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TRIGGER IF EXISTS trg_moderation_action_append_only ON moderation_action');
        $this->addSql('ALTER TABLE device_token DROP CONSTRAINT FK_99B2415C9B6B5FBA');
        $this->addSql('ALTER TABLE moderation_action DROP CONSTRAINT FK_B05D8128642B8210');
        $this->addSql('ALTER TABLE notification DROP CONSTRAINT FK_BF5476CAE92F8F78');
        $this->addSql('ALTER TABLE notification DROP CONSTRAINT FK_BF5476CA10DAF24A');
        $this->addSql('ALTER TABLE notification_preference DROP CONSTRAINT FK_A61B1571CCFA12B8');
        $this->addSql('DROP TABLE device_token');
        $this->addSql('DROP TABLE moderation_action');
        $this->addSql('DROP TABLE notification');
        $this->addSql('DROP TABLE notification_preference');
    }
}
