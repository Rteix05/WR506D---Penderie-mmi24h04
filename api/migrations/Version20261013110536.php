<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261013110536 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Look du jour sans IA : le contour du vêtement délimité par l\'IA (look_tag.box, ajouté par Version20261013081442) n\'a plus d\'usage.';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE look_tag DROP box');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE look_tag ADD box JSON DEFAULT NULL');
    }
}
