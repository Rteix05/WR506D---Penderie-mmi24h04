<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Domaine « Relations » du MDD V2 : Friendship et Follow. Block reste en V2.
 *
 * SQL des tables généré par doctrine:migrations:diff, complété à la main
 * (voir la migration Identité pour la raison) :
 *  - l'index unique sur la paire non ordonnée de Friendship, sur
 *    expression (LEAST, GREATEST), que Doctrine ne sait pas déclarer ;
 *  - les CHECK d'énumération, d'anti-réflexivité et de cohérence.
 *
 * Suppression d'un profil : ses relations disparaissent avec lui (CASCADE),
 * comme le prévoit le MDD — personne d'autre n'en dépend.
 */
final class Version20260929132456 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Relations : friendship, follow';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE follow (id UUID NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, follower_id UUID NOT NULL, following_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_follow_following ON follow (following_id)');
        $this->addSql('CREATE UNIQUE INDEX uniq_follow_pair ON follow (follower_id, following_id)');
        $this->addSql('CREATE INDEX IDX_68344470AC24F853 ON follow (follower_id)');
        $this->addSql('CREATE TABLE friendship (id UUID NOT NULL, status VARCHAR(20) NOT NULL, requested_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, responded_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, requester_id UUID NOT NULL, addressee_id UUID NOT NULL, approval_request_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_friendship_addressee_status ON friendship (addressee_id, status)');
        $this->addSql('CREATE INDEX idx_friendship_requester_status ON friendship (requester_id, status)');
        $this->addSql('CREATE INDEX IDX_7234A45FED442CF4 ON friendship (requester_id)');
        $this->addSql('CREATE INDEX IDX_7234A45F2261B4C3 ON friendship (addressee_id)');
        $this->addSql('CREATE INDEX IDX_7234A45F23E8BAA4 ON friendship (approval_request_id)');
        $this->addSql('ALTER TABLE follow ADD CONSTRAINT FK_68344470AC24F853 FOREIGN KEY (follower_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE follow ADD CONSTRAINT FK_683444701816E3A3 FOREIGN KEY (following_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE friendship ADD CONSTRAINT FK_7234A45FED442CF4 FOREIGN KEY (requester_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE friendship ADD CONSTRAINT FK_7234A45F2261B4C3 FOREIGN KEY (addressee_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE friendship ADD CONSTRAINT FK_7234A45F23E8BAA4 FOREIGN KEY (approval_request_id) REFERENCES approval_request (id) ON DELETE SET NULL NOT DEFERRABLE');

        // --- Friendship ------------------------------------------------------
        // Une seule ligne par paire, quel que soit le sens de la demande.
        $this->addSql('CREATE UNIQUE INDEX uniq_friendship_pair ON friendship (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))');
        $this->addSql("ALTER TABLE friendship ADD CONSTRAINT chk_friendship_status CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED'))");
        $this->addSql('ALTER TABLE friendship ADD CONSTRAINT chk_friendship_not_self CHECK (requester_id <> addressee_id)');
        // Une réponse porte sa date, une demande en attente n'en a pas.
        $this->addSql("ALTER TABLE friendship ADD CONSTRAINT chk_friendship_responded CHECK ((status = 'PENDING') = (responded_at IS NULL))");

        // --- Follow ----------------------------------------------------------
        $this->addSql('ALTER TABLE follow ADD CONSTRAINT chk_follow_not_self CHECK (follower_id <> following_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE follow DROP CONSTRAINT FK_68344470AC24F853');
        $this->addSql('ALTER TABLE follow DROP CONSTRAINT FK_683444701816E3A3');
        $this->addSql('ALTER TABLE friendship DROP CONSTRAINT FK_7234A45FED442CF4');
        $this->addSql('ALTER TABLE friendship DROP CONSTRAINT FK_7234A45F2261B4C3');
        $this->addSql('ALTER TABLE friendship DROP CONSTRAINT FK_7234A45F23E8BAA4');
        $this->addSql('DROP TABLE follow');
        $this->addSql('DROP TABLE friendship');
    }
}
