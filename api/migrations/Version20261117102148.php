<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261117102148 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Journal des scans (scan.duration_ms) et pré-analyse IA des signalements et litiges (ai_review, compte « Modération IA »).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE ai_review (id UUID NOT NULL, status VARCHAR(20) NOT NULL, verdict VARCHAR(20) DEFAULT NULL, sanction VARCHAR(20) DEFAULT NULL, confidence SMALLINT DEFAULT NULL, summary TEXT DEFAULT NULL, justification JSONB NOT NULL, evidence JSONB NOT NULL, message TEXT DEFAULT NULL, held_because TEXT DEFAULT NULL, applied_action VARCHAR(20) DEFAULT NULL, model VARCHAR(120) DEFAULT NULL, attempts JSONB NOT NULL, duration_ms INT NOT NULL, prompt_version VARCHAR(20) NOT NULL, input JSONB NOT NULL, answer JSONB DEFAULT NULL, error TEXT DEFAULT NULL, reviewed_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, review_note TEXT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, report_id UUID DEFAULT NULL, dispute_id UUID DEFAULT NULL, requested_by_id UUID DEFAULT NULL, reviewed_by_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_ai_review_status_created ON ai_review (status, created_at)');
        $this->addSql('CREATE INDEX IDX_7FA983E24BD2A4C0 ON ai_review (report_id)');
        $this->addSql('CREATE INDEX IDX_7FA983E2C7B47CB5 ON ai_review (dispute_id)');
        $this->addSql('CREATE INDEX IDX_7FA983E24DA1E751 ON ai_review (requested_by_id)');
        $this->addSql('CREATE INDEX IDX_7FA983E2FC6B21F1 ON ai_review (reviewed_by_id)');
        $this->addSql('ALTER TABLE ai_review ADD CONSTRAINT FK_7FA983E24BD2A4C0 FOREIGN KEY (report_id) REFERENCES report (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE ai_review ADD CONSTRAINT FK_7FA983E2C7B47CB5 FOREIGN KEY (dispute_id) REFERENCES dispute (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE ai_review ADD CONSTRAINT FK_7FA983E24DA1E751 FOREIGN KEY (requested_by_id) REFERENCES account (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE ai_review ADD CONSTRAINT FK_7FA983E2FC6B21F1 FOREIGN KEY (reviewed_by_id) REFERENCES account (id) ON DELETE SET NULL NOT DEFERRABLE');
        // Exactement l'un des deux : un signalement ou un litige. Confiance de 0 à 100.
        $this->addSql('ALTER TABLE ai_review ADD CONSTRAINT chk_ai_review_subject CHECK ((report_id IS NULL) <> (dispute_id IS NULL))');
        $this->addSql('ALTER TABLE ai_review ADD CONSTRAINT chk_ai_review_confidence CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 100)');

        // Le compte au nom duquel l'IA applique ses décisions (Account::AI_MODERATOR_ID).
        // Mot de passe vide : aucun hash ne correspond, personne ne s'y connecte ;
        // AdminUserChecker le refuse aussi au back-office. Domaine .invalid (RFC 2606).
        $this->addSql("INSERT INTO account (id, email, password, roles, locale, created_at, updated_at) VALUES ('00000000-0000-7000-8000-0000000000a1', 'moderation-ia@penderie.invalid', '', '[\"ROLE_ADMIN\"]', 'fr', now(), now()) ON CONFLICT (id) DO NOTHING");

        $this->addSql('ALTER TABLE scan ADD duration_ms INT DEFAULT NULL');
        $this->addSql('CREATE INDEX idx_scan_status_created ON scan (status, created_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE ai_review DROP CONSTRAINT FK_7FA983E24BD2A4C0');
        $this->addSql('ALTER TABLE ai_review DROP CONSTRAINT FK_7FA983E2C7B47CB5');
        $this->addSql('ALTER TABLE ai_review DROP CONSTRAINT FK_7FA983E24DA1E751');
        $this->addSql('ALTER TABLE ai_review DROP CONSTRAINT FK_7FA983E2FC6B21F1');
        $this->addSql('DROP TABLE ai_review');
        // Ses actions de modération pointent vers lui (RESTRICT) : on ne le supprime que s'il n'a rien fait.
        $this->addSql("DELETE FROM account WHERE id = '00000000-0000-7000-8000-0000000000a1' AND NOT EXISTS (SELECT 1 FROM moderation_action WHERE admin_id = '00000000-0000-7000-8000-0000000000a1')");
        $this->addSql('DROP INDEX idx_scan_status_created');
        $this->addSql('ALTER TABLE scan DROP duration_ms');
    }
}
