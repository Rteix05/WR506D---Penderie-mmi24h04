<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261117104752 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Suggestions de tenues : l’explication figée avec chaque suggestion (météo, raisons, source IA ou règles).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE outfit_suggestion ADD explanation JSONB DEFAULT \'{}\' NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE outfit_suggestion DROP explanation');
    }
}
