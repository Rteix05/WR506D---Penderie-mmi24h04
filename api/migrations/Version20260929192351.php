<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Domaine « Prêt » du MDD V2 : Loan et son journal LoanEvent.
 *
 * SQL des tables généré par doctrine:migrations:diff, complété à la main :
 *  - les CHECK (énumérations, cohérence des dates avec le statut, une
 *    seule cible, prêteur ≠ emprunteur) ;
 *  - l'écriture seule de loan_event, par un déclencheur de garde.
 *
 * Pourquoi un déclencheur et pas un REVOKE (écart avec le MDD) : le rôle
 * de l'application est superutilisateur dans l'image Docker PostgreSQL, et
 * un superutilisateur ignore les droits. Le déclencheur s'applique à tout
 * le monde. Il laisse passer la seule modification légitime, la
 * réaffectation de actor_id au profil fantôme.
 */
final class Version20260929192351 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Prêt : loan, loan_event (en écriture seule)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE loan (id UUID NOT NULL, status VARCHAR(20) NOT NULL, requested_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, accepted_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, received_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, due_date DATE DEFAULT NULL, return_declared_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, return_confirmed_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, note TEXT DEFAULT NULL, return_note TEXT DEFAULT NULL, condition_at_start VARCHAR(20) DEFAULT NULL, condition_at_return VARCHAR(20) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, item_id UUID DEFAULT NULL, garment_id UUID DEFAULT NULL, lender_id UUID NOT NULL, borrower_id UUID NOT NULL, approval_request_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_loan_status_due ON loan (status, due_date)');
        $this->addSql('CREATE INDEX idx_loan_borrower_status ON loan (borrower_id, status)');
        $this->addSql('CREATE INDEX idx_loan_lender_status ON loan (lender_id, status)');
        $this->addSql('CREATE UNIQUE INDEX uniq_loan_active_item ON loan (item_id) WHERE ((status)::text = \'ACTIVE\'::text)');
        $this->addSql('CREATE UNIQUE INDEX uniq_loan_active_garment ON loan (garment_id) WHERE ((status)::text = \'ACTIVE\'::text)');
        $this->addSql('CREATE INDEX IDX_C5D30D03126F525E ON loan (item_id)');
        $this->addSql('CREATE INDEX IDX_C5D30D039CDB257C ON loan (garment_id)');
        $this->addSql('CREATE INDEX IDX_C5D30D03855D3E3D ON loan (lender_id)');
        $this->addSql('CREATE INDEX IDX_C5D30D0311CE312B ON loan (borrower_id)');
        $this->addSql('CREATE INDEX IDX_C5D30D0323E8BAA4 ON loan (approval_request_id)');
        $this->addSql('CREATE TABLE loan_event (id UUID NOT NULL, type VARCHAR(30) NOT NULL, payload JSONB NOT NULL, occurred_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, loan_id UUID NOT NULL, actor_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_loan_event_loan_occurred ON loan_event (loan_id, occurred_at)');
        $this->addSql('CREATE INDEX IDX_6C1712F8CE73868F ON loan_event (loan_id)');
        $this->addSql('CREATE INDEX IDX_6C1712F810DAF24A ON loan_event (actor_id)');
        $this->addSql('ALTER TABLE loan ADD CONSTRAINT FK_C5D30D03126F525E FOREIGN KEY (item_id) REFERENCES item (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE loan ADD CONSTRAINT FK_C5D30D039CDB257C FOREIGN KEY (garment_id) REFERENCES garment (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE loan ADD CONSTRAINT FK_C5D30D03855D3E3D FOREIGN KEY (lender_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE loan ADD CONSTRAINT FK_C5D30D0311CE312B FOREIGN KEY (borrower_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE loan ADD CONSTRAINT FK_C5D30D0323E8BAA4 FOREIGN KEY (approval_request_id) REFERENCES approval_request (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE loan_event ADD CONSTRAINT FK_6C1712F8CE73868F FOREIGN KEY (loan_id) REFERENCES loan (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE loan_event ADD CONSTRAINT FK_6C1712F810DAF24A FOREIGN KEY (actor_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');

        // --- Loan ---------------------------------------------------------------------
        $this->addSql("ALTER TABLE loan ADD CONSTRAINT chk_loan_status CHECK (status IN ('REQUESTED', 'ACCEPTED', 'ACTIVE', 'RETURNED', 'DECLINED', 'CANCELLED', 'LOST'))");
        foreach (['condition_at_start', 'condition_at_return'] as $column) {
            $this->addSql("ALTER TABLE loan ADD CONSTRAINT chk_loan_{$column} CHECK ($column IS NULL OR $column IN ('NEW', 'EXCELLENT', 'GOOD', 'WORN', 'DAMAGED'))");
        }
        // Exactement un objet OU un vêtement (« une clé sur deux »).
        $this->addSql('ALTER TABLE loan ADD CONSTRAINT chk_loan_target CHECK ((item_id IS NULL) <> (garment_id IS NULL))');
        $this->addSql('ALTER TABLE loan ADD CONSTRAINT chk_loan_not_self CHECK (lender_id <> borrower_id)');
        // Les dates suivent le statut : impossible d'être actif sans avoir été remis, etc.
        $this->addSql("ALTER TABLE loan ADD CONSTRAINT chk_loan_accepted_at CHECK (status NOT IN ('ACCEPTED', 'ACTIVE', 'RETURNED', 'LOST') OR accepted_at IS NOT NULL)");
        $this->addSql("ALTER TABLE loan ADD CONSTRAINT chk_loan_received_at CHECK ((status IN ('ACTIVE', 'RETURNED', 'LOST')) = (received_at IS NOT NULL))");
        $this->addSql("ALTER TABLE loan ADD CONSTRAINT chk_loan_returned_at CHECK ((status = 'RETURNED') = (return_confirmed_at IS NOT NULL))");
        $this->addSql("ALTER TABLE loan ADD CONSTRAINT chk_loan_condition_at_return_when_returned CHECK (status = 'RETURNED' OR condition_at_return IS NULL)");

        // --- LoanEvent ------------------------------------------------------------------
        $this->addSql("ALTER TABLE loan_event ADD CONSTRAINT chk_loan_event_type CHECK (type IN ('REQUESTED', 'ACCEPTED', 'DECLINED', 'RECEIVED', 'REMINDER_SENT', 'DUE_DATE_CHANGED', 'RETURN_DECLARED', 'RETURNED', 'DAMAGE_REPORTED', 'DECLARED_LOST', 'CANCELLED'))");

        // Garde « écriture seule », réutilisable : refuse DELETE, et tout UPDATE qui
        // touche une autre colonne que celles passées en argument du déclencheur.
        $this->addSql(<<<'SQL'
            CREATE OR REPLACE FUNCTION penderie_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
                IF TG_OP = 'DELETE' THEN
                    RAISE EXCEPTION 'La table % est en écriture seule : suppression interdite.', TG_TABLE_NAME
                        USING ERRCODE = 'insufficient_privilege';
                END IF;
                IF (to_jsonb(NEW) - TG_ARGV) IS DISTINCT FROM (to_jsonb(OLD) - TG_ARGV) THEN
                    RAISE EXCEPTION 'La table % est en écriture seule : modification interdite.', TG_TABLE_NAME
                        USING ERRCODE = 'insufficient_privilege';
                END IF;
                RETURN NEW;
            END
            $$
            SQL);
        // actor_id reste modifiable : c'est la réaffectation au profil fantôme.
        $this->addSql("CREATE TRIGGER trg_loan_event_append_only BEFORE UPDATE OR DELETE ON loan_event FOR EACH ROW EXECUTE FUNCTION penderie_append_only('actor_id')");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TRIGGER IF EXISTS trg_loan_event_append_only ON loan_event');
        $this->addSql('ALTER TABLE loan DROP CONSTRAINT FK_C5D30D03126F525E');
        $this->addSql('ALTER TABLE loan DROP CONSTRAINT FK_C5D30D039CDB257C');
        $this->addSql('ALTER TABLE loan DROP CONSTRAINT FK_C5D30D03855D3E3D');
        $this->addSql('ALTER TABLE loan DROP CONSTRAINT FK_C5D30D0311CE312B');
        $this->addSql('ALTER TABLE loan DROP CONSTRAINT FK_C5D30D0323E8BAA4');
        $this->addSql('ALTER TABLE loan_event DROP CONSTRAINT FK_6C1712F8CE73868F');
        $this->addSql('ALTER TABLE loan_event DROP CONSTRAINT FK_6C1712F810DAF24A');
        $this->addSql('DROP TABLE loan');
        $this->addSql('DROP TABLE loan_event');
        // penderie_append_only() servira aussi au journal de modération : elle n'est
        // supprimée que si plus aucun déclencheur ne l'utilise.
        $this->addSql('DROP FUNCTION IF EXISTS penderie_append_only() RESTRICT');
    }
}
