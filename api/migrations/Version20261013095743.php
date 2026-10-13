<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261013095743 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Vêtement « à compléter » (créé d\'un titre depuis le look du jour) : garment.room_id et garment.category_id deviennent facultatifs. item.room_id reste obligatoire.';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE garment ALTER room_id DROP NOT NULL');
        $this->addSql('ALTER TABLE garment ALTER category_id DROP NOT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        // Échoue tant qu'il reste des vêtements à compléter : les compléter (ou les supprimer) d'abord.
        $this->addSql('ALTER TABLE garment ALTER room_id SET NOT NULL');
        $this->addSql('ALTER TABLE garment ALTER category_id SET NOT NULL');
    }
}
