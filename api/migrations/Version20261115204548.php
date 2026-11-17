<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Account.lastSeenAt : le dernier jour d'utilisation de l'app (carte
 * « Utilisateurs actifs » du back-office).
 */
final class Version20261115204548 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Account.lastSeenAt, estimé pour les comptes existants d\'après leurs jetons de rafraîchissement.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE account ADD last_seen_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        // Pour ne pas partir de zéro : un jeton de rafraîchissement expire
        // 30 jours après son dernier usage (ttl 2592000 s, ttl_update), donc
        // « expiration - 30 jours » est le dernier usage de l'app.
        $this->addSql(<<<'SQL'
            UPDATE account a SET last_seen_at = LEAST(now(), t.valid - interval '30 days')
            FROM (SELECT username, MAX(valid) AS valid FROM refresh_tokens GROUP BY username) t
            WHERE t.username = a.email
            SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE account DROP last_seen_at');
    }
}
