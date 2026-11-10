<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261110120235 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE report (id UUID NOT NULL, target_type VARCHAR(20) NOT NULL, target_id UUID NOT NULL, reason VARCHAR(20) NOT NULL, description TEXT DEFAULT NULL, status VARCHAR(20) NOT NULL, handled_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, resolution TEXT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, reporter_id UUID NOT NULL, handled_by_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_report_status_created ON report (status, created_at)');
        $this->addSql('CREATE INDEX idx_report_target ON report (target_type, target_id)');
        $this->addSql('CREATE INDEX IDX_C42F7784E1CFE6F5 ON report (reporter_id)');
        $this->addSql('CREATE INDEX IDX_C42F7784FE65AF40 ON report (handled_by_id)');
        $this->addSql('ALTER TABLE report ADD CONSTRAINT FK_C42F7784E1CFE6F5 FOREIGN KEY (reporter_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE report ADD CONSTRAINT FK_C42F7784FE65AF40 FOREIGN KEY (handled_by_id) REFERENCES account (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE moderation_action ADD report_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE moderation_action ADD CONSTRAINT FK_B05D81284BD2A4C0 FOREIGN KEY (report_id) REFERENCES report (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('CREATE INDEX IDX_B05D81284BD2A4C0 ON moderation_action (report_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE report DROP CONSTRAINT FK_C42F7784E1CFE6F5');
        $this->addSql('ALTER TABLE report DROP CONSTRAINT FK_C42F7784FE65AF40');
        $this->addSql('DROP TABLE report');
        $this->addSql('ALTER TABLE moderation_action DROP CONSTRAINT FK_B05D81284BD2A4C0');
        $this->addSql('DROP INDEX IDX_B05D81284BD2A4C0');
        $this->addSql('ALTER TABLE moderation_action DROP report_id');
    }
}
