<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Visibilité (décisions du 30/09) : privé par défaut, trois niveaux
 * Rien / Lire / Modifier, objet personnel, partage du logement et du look,
 * repartage par une personne autorisée, contributions validées par le
 * propriétaire.
 *
 * SQL généré par doctrine:migrations:diff, repris à la main pour passer
 * sur une base qui contient déjà des partages :
 *  - is_personal ajouté à false, shared_by_id rempli avec le propriétaire
 *    avant d'être rendu obligatoire ;
 *  - les anciens niveaux VIEW / VIEW_COMMENTS / COMMENT deviennent READ
 *    (« lire inclut commenter », entre amis) ;
 *  - les CHECK de share réécrits (niveaux, EDIT réservé aux personnes
 *    nommées, deux nouvelles cibles) et ceux de contribution ajoutés.
 */
final class Version20260930063735 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Visibilité : niveaux READ/EDIT, objet personnel, partage du logement et du look, repartage, contributions';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE contribution (id UUID NOT NULL, kind VARCHAR(30) NOT NULL, status VARCHAR(20) NOT NULL, entry_kind VARCHAR(20) DEFAULT NULL, caption TEXT DEFAULT NULL, changes JSONB DEFAULT NULL, decided_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, note TEXT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, contributor_id UUID NOT NULL, grant_id UUID NOT NULL, item_id UUID DEFAULT NULL, garment_id UUID DEFAULT NULL, room_id UUID DEFAULT NULL, storage_id UUID DEFAULT NULL, box_id UUID DEFAULT NULL, collection_id UUID DEFAULT NULL, media_id UUID DEFAULT NULL, decided_by_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_contribution_grant_status ON contribution (grant_id, status)');
        $this->addSql('CREATE INDEX idx_contribution_contributor ON contribution (contributor_id, created_at)');
        $this->addSql('CREATE INDEX IDX_EA351E157A19A357 ON contribution (contributor_id)');
        $this->addSql('CREATE INDEX IDX_EA351E155C0C89F3 ON contribution (grant_id)');
        $this->addSql('CREATE INDEX IDX_EA351E15126F525E ON contribution (item_id)');
        $this->addSql('CREATE INDEX IDX_EA351E159CDB257C ON contribution (garment_id)');
        $this->addSql('CREATE INDEX IDX_EA351E1554177093 ON contribution (room_id)');
        $this->addSql('CREATE INDEX IDX_EA351E155CC5DB90 ON contribution (storage_id)');
        $this->addSql('CREATE INDEX IDX_EA351E15D8177B3F ON contribution (box_id)');
        $this->addSql('CREATE INDEX IDX_EA351E15514956FD ON contribution (collection_id)');
        $this->addSql('CREATE INDEX IDX_EA351E15EA9FDD75 ON contribution (media_id)');
        $this->addSql('CREATE INDEX IDX_EA351E15E26B496B ON contribution (decided_by_id)');
        $this->addSql('ALTER TABLE contribution ADD CONSTRAINT FK_EA351E157A19A357 FOREIGN KEY (contributor_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE contribution ADD CONSTRAINT FK_EA351E155C0C89F3 FOREIGN KEY (grant_id) REFERENCES share (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE contribution ADD CONSTRAINT FK_EA351E15126F525E FOREIGN KEY (item_id) REFERENCES item (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE contribution ADD CONSTRAINT FK_EA351E159CDB257C FOREIGN KEY (garment_id) REFERENCES garment (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE contribution ADD CONSTRAINT FK_EA351E1554177093 FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE contribution ADD CONSTRAINT FK_EA351E155CC5DB90 FOREIGN KEY (storage_id) REFERENCES storage (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE contribution ADD CONSTRAINT FK_EA351E15D8177B3F FOREIGN KEY (box_id) REFERENCES box (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE contribution ADD CONSTRAINT FK_EA351E15514956FD FOREIGN KEY (collection_id) REFERENCES collection (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE contribution ADD CONSTRAINT FK_EA351E15EA9FDD75 FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE contribution ADD CONSTRAINT FK_EA351E15E26B496B FOREIGN KEY (decided_by_id) REFERENCES profile (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment ADD is_personal BOOLEAN DEFAULT false NOT NULL');
        $this->addSql('ALTER TABLE garment ALTER is_personal DROP DEFAULT');
        $this->addSql('ALTER TABLE item ADD is_personal BOOLEAN DEFAULT false NOT NULL');
        $this->addSql('ALTER TABLE item ALTER is_personal DROP DEFAULT');
        // Tous les partages existants ont été faits par leur propriétaire.
        $this->addSql('ALTER TABLE share ADD shared_by_id UUID DEFAULT NULL');
        $this->addSql('UPDATE share SET shared_by_id = owner_id');
        $this->addSql('ALTER TABLE share ALTER shared_by_id SET NOT NULL');
        $this->addSql('ALTER TABLE share ADD place_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE share ADD outfit_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE share ADD CONSTRAINT FK_EF069D5A5489CD19 FOREIGN KEY (shared_by_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE share ADD CONSTRAINT FK_EF069D5ADA6A219 FOREIGN KEY (place_id) REFERENCES place (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE share ADD CONSTRAINT FK_EF069D5AAE96E385 FOREIGN KEY (outfit_id) REFERENCES outfit (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('CREATE INDEX IDX_EF069D5A5489CD19 ON share (shared_by_id)');
        $this->addSql('CREATE INDEX IDX_EF069D5ADA6A219 ON share (place_id)');
        $this->addSql('CREATE INDEX IDX_EF069D5AAE96E385 ON share (outfit_id)');

        // --- Share : niveaux, audiences, nouvelles cibles --------------------------------
        $this->addSql('ALTER TABLE share DROP CONSTRAINT chk_share_access_level');
        $this->addSql('ALTER TABLE share DROP CONSTRAINT chk_share_read_only_audience');
        $this->addSql('ALTER TABLE share DROP CONSTRAINT chk_share_target_type');
        $this->addSql("UPDATE share SET access_level = 'READ'");
        $this->addSql("ALTER TABLE share ADD CONSTRAINT chk_share_access_level CHECK (access_level IN ('READ', 'EDIT'))");
        // « Modifier » ne se donne qu'à des personnes nommées ; abonnés et lien lisent seulement.
        $this->addSql("ALTER TABLE share ADD CONSTRAINT chk_share_edit_specific CHECK (access_level = 'READ' OR audience = 'SPECIFIC')");
        $this->addSql("ALTER TABLE share ADD CONSTRAINT chk_share_target_type CHECK (target_type IN ('ITEM', 'GARMENT', 'ROOM', 'BOX', 'COLLECTION', 'PLACE', 'OUTFIT'))");
        foreach (['PLACE' => 'place_id', 'OUTFIT' => 'outfit_id'] as $type => $column) {
            $this->addSql("ALTER TABLE share ADD CONSTRAINT chk_share_target_{$column} CHECK ((target_type = '$type') = ($column IS NOT NULL))");
        }

        // --- Contribution -------------------------------------------------------------------
        $this->addSql("ALTER TABLE contribution ADD CONSTRAINT chk_contribution_kind CHECK (kind IN ('PLACE_POSSESSION', 'ADD_COLLECTION_ENTRY', 'EDIT_FIELDS'))");
        $this->addSql("ALTER TABLE contribution ADD CONSTRAINT chk_contribution_status CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'))");
        $this->addSql("ALTER TABLE contribution ADD CONSTRAINT chk_contribution_entry_kind CHECK (entry_kind IS NULL OR entry_kind IN ('ITEM', 'GARMENT', 'MEDIA', 'TEXT'))");
        // Une décision porte sa date, une proposition en attente non.
        $this->addSql("ALTER TABLE contribution ADD CONSTRAINT chk_contribution_decided CHECK ((status = 'PENDING') = (decided_at IS NULL))");
        $this->addSql('ALTER TABLE contribution ADD CONSTRAINT chk_contribution_one_possession CHECK (item_id IS NULL OR garment_id IS NULL)');
        // Chaque sorte remplit ses colonnes, et seulement les siennes.
        $this->addSql(<<<'SQL'
            ALTER TABLE contribution ADD CONSTRAINT chk_contribution_shape CHECK (
                   (kind = 'PLACE_POSSESSION' AND (item_id IS NOT NULL OR garment_id IS NOT NULL) AND room_id IS NOT NULL
                        AND collection_id IS NULL AND media_id IS NULL AND changes IS NULL AND entry_kind IS NULL)
                OR (kind = 'ADD_COLLECTION_ENTRY' AND collection_id IS NOT NULL AND entry_kind IS NOT NULL
                        AND room_id IS NULL AND changes IS NULL)
                OR (kind = 'EDIT_FIELDS' AND changes IS NOT NULL AND item_id IS NULL AND garment_id IS NULL
                        AND media_id IS NULL AND room_id IS NULL AND collection_id IS NULL)
            )
            SQL);
    }

    public function down(Schema $schema): void
    {
        // Retour aux niveaux d'avant : les partages de logement et de look, et les
        // repartages, n'y existent pas et sont supprimés ; READ devient VIEW_COMMENTS
        // entre amis et VIEW sinon, EDIT devient COMMENT.
        $this->addSql("DELETE FROM share WHERE target_type IN ('PLACE', 'OUTFIT') OR shared_by_id <> owner_id");
        $this->addSql('ALTER TABLE share DROP CONSTRAINT chk_share_access_level');
        $this->addSql('ALTER TABLE share DROP CONSTRAINT chk_share_edit_specific');
        $this->addSql('ALTER TABLE share DROP CONSTRAINT chk_share_target_type');
        $this->addSql('ALTER TABLE share DROP CONSTRAINT chk_share_target_place_id');
        $this->addSql('ALTER TABLE share DROP CONSTRAINT chk_share_target_outfit_id');
        $this->addSql("UPDATE share SET access_level = CASE WHEN access_level = 'EDIT' THEN 'COMMENT' WHEN audience IN ('FRIENDS', 'SPECIFIC') THEN 'VIEW_COMMENTS' ELSE 'VIEW' END");
        $this->addSql("ALTER TABLE share ADD CONSTRAINT chk_share_access_level CHECK (access_level IN ('VIEW', 'VIEW_COMMENTS', 'COMMENT'))");
        $this->addSql("ALTER TABLE share ADD CONSTRAINT chk_share_read_only_audience CHECK (audience IN ('FRIENDS', 'SPECIFIC') OR access_level = 'VIEW')");
        $this->addSql("ALTER TABLE share ADD CONSTRAINT chk_share_target_type CHECK (target_type IN ('ITEM', 'GARMENT', 'ROOM', 'BOX', 'COLLECTION'))");
        $this->addSql('ALTER TABLE contribution DROP CONSTRAINT FK_EA351E157A19A357');
        $this->addSql('ALTER TABLE contribution DROP CONSTRAINT FK_EA351E155C0C89F3');
        $this->addSql('ALTER TABLE contribution DROP CONSTRAINT FK_EA351E15126F525E');
        $this->addSql('ALTER TABLE contribution DROP CONSTRAINT FK_EA351E159CDB257C');
        $this->addSql('ALTER TABLE contribution DROP CONSTRAINT FK_EA351E1554177093');
        $this->addSql('ALTER TABLE contribution DROP CONSTRAINT FK_EA351E155CC5DB90');
        $this->addSql('ALTER TABLE contribution DROP CONSTRAINT FK_EA351E15D8177B3F');
        $this->addSql('ALTER TABLE contribution DROP CONSTRAINT FK_EA351E15514956FD');
        $this->addSql('ALTER TABLE contribution DROP CONSTRAINT FK_EA351E15EA9FDD75');
        $this->addSql('ALTER TABLE contribution DROP CONSTRAINT FK_EA351E15E26B496B');
        $this->addSql('DROP TABLE contribution');
        $this->addSql('ALTER TABLE garment DROP is_personal');
        $this->addSql('ALTER TABLE item DROP is_personal');
        $this->addSql('ALTER TABLE share DROP CONSTRAINT FK_EF069D5A5489CD19');
        $this->addSql('ALTER TABLE share DROP CONSTRAINT FK_EF069D5ADA6A219');
        $this->addSql('ALTER TABLE share DROP CONSTRAINT FK_EF069D5AAE96E385');
        $this->addSql('DROP INDEX IDX_EF069D5A5489CD19');
        $this->addSql('DROP INDEX IDX_EF069D5ADA6A219');
        $this->addSql('DROP INDEX IDX_EF069D5AAE96E385');
        $this->addSql('ALTER TABLE share DROP shared_by_id');
        $this->addSql('ALTER TABLE share DROP place_id');
        $this->addSql('ALTER TABLE share DROP outfit_id');
    }
}
