<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261013075301 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Look du jour publié dans le fil : daily_look.post_id (une publication par look, SET NULL).';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE daily_look ADD post_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE daily_look ADD CONSTRAINT FK_6F3CCB974B89032C FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_6F3CCB974B89032C ON daily_look (post_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE daily_look DROP CONSTRAINT FK_6F3CCB974B89032C');
        $this->addSql('DROP INDEX UNIQ_6F3CCB974B89032C');
        $this->addSql('ALTER TABLE daily_look DROP post_id');
    }
}
