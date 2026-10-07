<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260930083312 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Droits du foyer et colocation : membres du logement, pièces fermées, décisions à l\'unanimité, partage d\'un rangement, propositions du foyer.';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE place_decision (id UUID NOT NULL, kind VARCHAR(20) NOT NULL, status VARCHAR(20) NOT NULL, closed_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, place_id UUID NOT NULL, requested_by_id UUID NOT NULL, invitee_id UUID DEFAULT NULL, room_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_place_decision_place_status ON place_decision (place_id, status)');
        $this->addSql('CREATE INDEX IDX_AEF759CBDA6A219 ON place_decision (place_id)');
        $this->addSql('CREATE INDEX IDX_AEF759CB4DA1E751 ON place_decision (requested_by_id)');
        $this->addSql('CREATE INDEX IDX_AEF759CB7A512022 ON place_decision (invitee_id)');
        $this->addSql('CREATE INDEX IDX_AEF759CB54177093 ON place_decision (room_id)');
        $this->addSql('CREATE TABLE place_decision_vote (id UUID NOT NULL, approval BOOLEAN NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, decision_id UUID NOT NULL, voter_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX uniq_place_decision_vote ON place_decision_vote (decision_id, voter_id)');
        $this->addSql('CREATE INDEX IDX_AFFA98AFBDEE7539 ON place_decision_vote (decision_id)');
        $this->addSql('CREATE INDEX IDX_AFFA98AFEBB4B8AD ON place_decision_vote (voter_id)');
        $this->addSql('CREATE TABLE place_member (id UUID NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, place_id UUID NOT NULL, profile_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_place_member_profile ON place_member (profile_id)');
        $this->addSql('CREATE UNIQUE INDEX uniq_place_member ON place_member (place_id, profile_id)');
        $this->addSql('CREATE INDEX IDX_D22AFD11DA6A219 ON place_member (place_id)');
        $this->addSql('CREATE TABLE room_allowed_member (room_id UUID NOT NULL, profile_id UUID NOT NULL, PRIMARY KEY (room_id, profile_id))');
        $this->addSql('CREATE INDEX IDX_B12FF67954177093 ON room_allowed_member (room_id)');
        $this->addSql('CREATE INDEX IDX_B12FF679CCFA12B8 ON room_allowed_member (profile_id)');
        $this->addSql('ALTER TABLE place_decision ADD CONSTRAINT FK_AEF759CBDA6A219 FOREIGN KEY (place_id) REFERENCES place (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE place_decision ADD CONSTRAINT FK_AEF759CB4DA1E751 FOREIGN KEY (requested_by_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE place_decision ADD CONSTRAINT FK_AEF759CB7A512022 FOREIGN KEY (invitee_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE place_decision ADD CONSTRAINT FK_AEF759CB54177093 FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE place_decision_vote ADD CONSTRAINT FK_AFFA98AFBDEE7539 FOREIGN KEY (decision_id) REFERENCES place_decision (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE place_decision_vote ADD CONSTRAINT FK_AFFA98AFEBB4B8AD FOREIGN KEY (voter_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE place_member ADD CONSTRAINT FK_D22AFD11DA6A219 FOREIGN KEY (place_id) REFERENCES place (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE place_member ADD CONSTRAINT FK_D22AFD11CCFA12B8 FOREIGN KEY (profile_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE room_allowed_member ADD CONSTRAINT FK_B12FF67954177093 FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE room_allowed_member ADD CONSTRAINT FK_B12FF679CCFA12B8 FOREIGN KEY (profile_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE contribution ADD basis VARCHAR(20) DEFAULT NULL');
        $this->addSql('ALTER TABLE contribution ADD target_type VARCHAR(20) DEFAULT NULL');
        $this->addSql('ALTER TABLE contribution ADD target_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE contribution ADD owner_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE contribution ALTER grant_id DROP NOT NULL');
        // Les propositions existantes viennent toutes d'un partage : son propriétaire valide, sa cible est corrigée.
        $this->addSql("UPDATE contribution c SET basis = 'SHARE', owner_id = s.owner_id FROM share s WHERE s.id = c.grant_id");
        $this->addSql(<<<'SQL'
            UPDATE contribution c SET target_type = s.target_type,
                   target_id = COALESCE(s.item_id, s.garment_id, s.room_id, s.box_id, s.collection_id, s.place_id, s.outfit_id)
            FROM share s WHERE s.id = c.grant_id AND c.kind = 'EDIT_FIELDS'
            SQL);
        $this->addSql('ALTER TABLE contribution ALTER basis SET NOT NULL');
        $this->addSql('ALTER TABLE contribution ALTER owner_id SET NOT NULL');
        $this->addSql('ALTER TABLE contribution ADD CONSTRAINT FK_EA351E157E3C61F9 FOREIGN KEY (owner_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('CREATE INDEX idx_contribution_owner_status ON contribution (owner_id, status)');
        $this->addSql('CREATE INDEX IDX_EA351E157E3C61F9 ON contribution (owner_id)');
        $this->addSql('ALTER TABLE room ADD is_closed BOOLEAN DEFAULT false NOT NULL');
        $this->addSql('ALTER TABLE room ALTER is_closed DROP DEFAULT');
        $this->addSql('ALTER TABLE room ADD created_by_id UUID DEFAULT NULL');
        $this->addSql('UPDATE room r SET created_by_id = p.owner_id FROM place p WHERE p.id = r.place_id');
        $this->addSql('ALTER TABLE room ALTER created_by_id SET NOT NULL');
        $this->addSql('ALTER TABLE room ADD CONSTRAINT FK_729F519BB03A8386 FOREIGN KEY (created_by_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('CREATE INDEX IDX_729F519BB03A8386 ON room (created_by_id)');
        $this->addSql('ALTER TABLE share ADD storage_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE share ADD CONSTRAINT FK_EF069D5A5CC5DB90 FOREIGN KEY (storage_id) REFERENCES storage (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('CREATE INDEX IDX_EF069D5A5CC5DB90 ON share (storage_id)');

        // Chaque logement existant : son propriétaire en est le premier (et seul) membre.
        $this->addSql('INSERT INTO place_member (id, place_id, profile_id, created_at, updated_at) SELECT gen_random_uuid(), id, owner_id, created_at, now() FROM place');

        // Partage d'un rangement.
        $this->addSql('ALTER TABLE share DROP CONSTRAINT chk_share_target_type');
        $this->addSql("ALTER TABLE share ADD CONSTRAINT chk_share_target_type CHECK (target_type IN ('ITEM', 'GARMENT', 'ROOM', 'STORAGE', 'BOX', 'COLLECTION', 'PLACE', 'OUTFIT'))");
        $this->addSql("ALTER TABLE share ADD CONSTRAINT chk_share_target_storage_id CHECK ((target_type = 'STORAGE') = (storage_id IS NOT NULL))");

        // Propositions : par un partage (grant) ou au sein du foyer ; une correction dit ce qu'elle corrige.
        $this->addSql("ALTER TABLE contribution ADD CONSTRAINT chk_contribution_basis CHECK (basis IN ('SHARE', 'HOUSEHOLD'))");
        $this->addSql("ALTER TABLE contribution ADD CONSTRAINT chk_contribution_grant CHECK ((basis = 'SHARE') = (grant_id IS NOT NULL))");
        $this->addSql("ALTER TABLE contribution ADD CONSTRAINT chk_contribution_collection_by_share CHECK (kind <> 'ADD_COLLECTION_ENTRY' OR basis = 'SHARE')");
        $this->addSql("ALTER TABLE contribution ADD CONSTRAINT chk_contribution_target CHECK ((kind = 'EDIT_FIELDS') = (target_type IS NOT NULL) AND (target_type IS NULL) = (target_id IS NULL))");
        $this->addSql("ALTER TABLE contribution ADD CONSTRAINT chk_contribution_target_type CHECK (target_type IS NULL OR target_type IN ('ITEM', 'GARMENT', 'PLACE', 'ROOM', 'STORAGE', 'BOX', 'COLLECTION', 'OUTFIT', 'GARMENT_CATEGORY', 'ITEM_CATEGORY'))");

        // Décisions à l'unanimité : chaque sorte a sa cible, une décision close a sa date.
        $this->addSql("ALTER TABLE place_decision ADD CONSTRAINT chk_place_decision_kind CHECK (kind IN ('INVITE_MEMBER', 'DELETE_PLACE', 'DELETE_ROOM'))");
        $this->addSql("ALTER TABLE place_decision ADD CONSTRAINT chk_place_decision_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'))");
        $this->addSql("ALTER TABLE place_decision ADD CONSTRAINT chk_place_decision_invitee CHECK ((kind = 'INVITE_MEMBER') = (invitee_id IS NOT NULL))");
        $this->addSql("ALTER TABLE place_decision ADD CONSTRAINT chk_place_decision_room CHECK ((kind = 'DELETE_ROOM') = (room_id IS NOT NULL))");
        $this->addSql("ALTER TABLE place_decision ADD CONSTRAINT chk_place_decision_closed CHECK ((status = 'PENDING') = (closed_at IS NULL))");
    }

    public function down(Schema $schema): void
    {
        // Avant : pas de partage de rangement, pas de proposition du foyer.
        $this->addSql("DELETE FROM share WHERE target_type = 'STORAGE'");
        $this->addSql("DELETE FROM contribution WHERE basis = 'HOUSEHOLD'");
        $this->addSql('ALTER TABLE share DROP CONSTRAINT chk_share_target_storage_id');
        $this->addSql('ALTER TABLE share DROP CONSTRAINT chk_share_target_type');
        $this->addSql("ALTER TABLE share ADD CONSTRAINT chk_share_target_type CHECK (target_type IN ('ITEM', 'GARMENT', 'ROOM', 'BOX', 'COLLECTION', 'PLACE', 'OUTFIT'))");
        foreach (['basis', 'grant', 'collection_by_share', 'target', 'target_type'] as $check) {
            $this->addSql("ALTER TABLE contribution DROP CONSTRAINT chk_contribution_$check");
        }
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE place_decision DROP CONSTRAINT FK_AEF759CBDA6A219');
        $this->addSql('ALTER TABLE place_decision DROP CONSTRAINT FK_AEF759CB4DA1E751');
        $this->addSql('ALTER TABLE place_decision DROP CONSTRAINT FK_AEF759CB7A512022');
        $this->addSql('ALTER TABLE place_decision DROP CONSTRAINT FK_AEF759CB54177093');
        $this->addSql('ALTER TABLE place_decision_vote DROP CONSTRAINT FK_AFFA98AFBDEE7539');
        $this->addSql('ALTER TABLE place_decision_vote DROP CONSTRAINT FK_AFFA98AFEBB4B8AD');
        $this->addSql('ALTER TABLE place_member DROP CONSTRAINT FK_D22AFD11DA6A219');
        $this->addSql('ALTER TABLE place_member DROP CONSTRAINT FK_D22AFD11CCFA12B8');
        $this->addSql('ALTER TABLE room_allowed_member DROP CONSTRAINT FK_B12FF67954177093');
        $this->addSql('ALTER TABLE room_allowed_member DROP CONSTRAINT FK_B12FF679CCFA12B8');
        $this->addSql('DROP TABLE place_decision');
        $this->addSql('DROP TABLE place_decision_vote');
        $this->addSql('DROP TABLE place_member');
        $this->addSql('DROP TABLE room_allowed_member');
        $this->addSql('ALTER TABLE contribution DROP CONSTRAINT FK_EA351E157E3C61F9');
        $this->addSql('DROP INDEX idx_contribution_owner_status');
        $this->addSql('DROP INDEX IDX_EA351E157E3C61F9');
        $this->addSql('ALTER TABLE contribution DROP basis');
        $this->addSql('ALTER TABLE contribution DROP target_type');
        $this->addSql('ALTER TABLE contribution DROP target_id');
        $this->addSql('ALTER TABLE contribution DROP owner_id');
        $this->addSql('ALTER TABLE contribution ALTER grant_id SET NOT NULL');
        $this->addSql('ALTER TABLE room DROP CONSTRAINT FK_729F519BB03A8386');
        $this->addSql('DROP INDEX IDX_729F519BB03A8386');
        $this->addSql('ALTER TABLE room DROP is_closed');
        $this->addSql('ALTER TABLE room DROP created_by_id');
        $this->addSql('ALTER TABLE share DROP CONSTRAINT FK_EF069D5A5CC5DB90');
        $this->addSql('DROP INDEX IDX_EF069D5A5CC5DB90');
        $this->addSql('ALTER TABLE share DROP storage_id');
    }
}
