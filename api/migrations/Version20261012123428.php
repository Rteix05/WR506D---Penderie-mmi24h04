<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261012123428 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Look du jour : la photo (daily_look, un par profil et par jour) et les points posés sur chaque vêtement porté (look_tag).';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE daily_look (id UUID NOT NULL, worn_on DATE NOT NULL, status VARCHAR(20) NOT NULL, caption TEXT DEFAULT NULL, posted_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, owner_id UUID NOT NULL, photo_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX uniq_daily_look_owner_day ON daily_look (owner_id, worn_on)');
        $this->addSql('CREATE INDEX IDX_6F3CCB977E3C61F9 ON daily_look (owner_id)');
        $this->addSql('CREATE INDEX IDX_6F3CCB977E9E4C8C ON daily_look (photo_id)');
        $this->addSql('CREATE TABLE look_tag (id UUID NOT NULL, x DOUBLE PRECISION NOT NULL, y DOUBLE PRECISION NOT NULL, position INT NOT NULL, status VARCHAR(20) NOT NULL, suggestion JSON DEFAULT NULL, detection JSON DEFAULT NULL, look_id UUID NOT NULL, garment_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_E77EDC27469DC8DC ON look_tag (look_id)');
        $this->addSql('CREATE INDEX IDX_E77EDC279CDB257C ON look_tag (garment_id)');
        // Un point est sur la photo : position relative, de 0 à 1.
        $this->addSql('ALTER TABLE look_tag ADD CONSTRAINT chk_look_tag_on_photo CHECK (x BETWEEN 0 AND 1 AND y BETWEEN 0 AND 1)');
        $this->addSql('ALTER TABLE daily_look ADD CONSTRAINT FK_6F3CCB977E3C61F9 FOREIGN KEY (owner_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE daily_look ADD CONSTRAINT FK_6F3CCB977E9E4C8C FOREIGN KEY (photo_id) REFERENCES media (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE look_tag ADD CONSTRAINT FK_E77EDC27469DC8DC FOREIGN KEY (look_id) REFERENCES daily_look (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE look_tag ADD CONSTRAINT FK_E77EDC279CDB257C FOREIGN KEY (garment_id) REFERENCES garment (id) ON DELETE SET NULL NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE daily_look DROP CONSTRAINT FK_6F3CCB977E3C61F9');
        $this->addSql('ALTER TABLE daily_look DROP CONSTRAINT FK_6F3CCB977E9E4C8C');
        $this->addSql('ALTER TABLE look_tag DROP CONSTRAINT FK_E77EDC27469DC8DC');
        $this->addSql('ALTER TABLE look_tag DROP CONSTRAINT FK_E77EDC279CDB257C');
        $this->addSql('DROP TABLE daily_look');
        $this->addSql('DROP TABLE look_tag');
    }
}
