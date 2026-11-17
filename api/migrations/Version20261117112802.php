<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261117112802 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Les « j’aime » des publications du fil (post_like).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE post_like (created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, post_id UUID NOT NULL, profile_id UUID NOT NULL, PRIMARY KEY (post_id, profile_id))');
        $this->addSql('CREATE INDEX idx_post_like_profile ON post_like (profile_id)');
        $this->addSql('CREATE INDEX IDX_653627B84B89032C ON post_like (post_id)');
        $this->addSql('ALTER TABLE post_like ADD CONSTRAINT FK_653627B84B89032C FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE post_like ADD CONSTRAINT FK_653627B8CCFA12B8 FOREIGN KEY (profile_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE post_like DROP CONSTRAINT FK_653627B84B89032C');
        $this->addSql('ALTER TABLE post_like DROP CONSTRAINT FK_653627B8CCFA12B8');
        $this->addSql('DROP TABLE post_like');
    }
}
