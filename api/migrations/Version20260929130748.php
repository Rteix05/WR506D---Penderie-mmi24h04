<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Domaine « Identité & accès » du MDD V2 : Account, Profile,
 * ProfilePermission, ApprovalRequest, et Media (Profile.avatarMedia en
 * dépend).
 *
 * Le SQL des tables est généré par doctrine:migrations:diff. Les contraintes
 * CHECK sont ajoutées à la main : Doctrine ne sait pas les déclarer en
 * attribut, et ne les voit pas en comparant le schéma (un diff ultérieur ne
 * les supprimera donc pas). Les listes de valeurs sont recopiées ici plutôt
 * que lues dans les enums PHP : une migration décrit l'état de la base à un
 * instant donné et ne doit pas changer quand le code évolue.
 *
 * Elle insère aussi le compte et le profil fantômes (Account::GHOST_ID,
 * Profile::GHOST_ID) : une suppression réaffecte au fantôme ce qui doit lui
 * survivre (prêts terminés, commandes, commentaires), puis supprime vraiment
 * la ligne.
 */
final class Version20260929130748 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Identité & accès : account, profile, profile_permission, approval_request, media';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE account (id UUID NOT NULL, email VARCHAR(180) NOT NULL, password VARCHAR(255) NOT NULL, roles JSON NOT NULL, email_verified_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, locale VARCHAR(10) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_7D3656A4E7927C74 ON account (email)');
        $this->addSql('CREATE TABLE approval_request (id UUID NOT NULL, permission VARCHAR(30) NOT NULL, subject_type VARCHAR(20) DEFAULT NULL, subject_id UUID DEFAULT NULL, payload JSONB NOT NULL, status VARCHAR(20) NOT NULL, decided_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, decision_note TEXT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, requester_id UUID NOT NULL, approver_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_approval_request_approver_status ON approval_request (approver_id, status)');
        $this->addSql('CREATE INDEX idx_approval_request_requester ON approval_request (requester_id)');
        $this->addSql('CREATE INDEX IDX_AFD730D9BB23766C ON approval_request (approver_id)');
        $this->addSql('CREATE TABLE media (id UUID NOT NULL, path VARCHAR(255) NOT NULL, mime_type VARCHAR(100) NOT NULL, size_bytes INT NOT NULL, width INT DEFAULT NULL, height INT DEFAULT NULL, kind VARCHAR(20) NOT NULL, alt_text VARCHAR(255) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, owner_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_6A2CA10CB548B0F ON media (path)');
        $this->addSql('CREATE INDEX idx_media_owner_created ON media (owner_id, created_at)');
        $this->addSql('CREATE INDEX IDX_6A2CA10C7E3C61F9 ON media (owner_id)');
        $this->addSql('CREATE TABLE profile (id UUID NOT NULL, first_name VARCHAR(80) NOT NULL, last_name VARCHAR(80) NOT NULL, date_of_birth DATE NOT NULL, username VARCHAR(30) NOT NULL, display_name VARCHAR(60) NOT NULL, type VARCHAR(20) NOT NULL, bio TEXT DEFAULT NULL, is_default BOOLEAN NOT NULL, suspended_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, account_id UUID NOT NULL, guardian_id UUID DEFAULT NULL, avatar_media_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_8157AA0FF85E0677 ON profile (username)');
        $this->addSql('CREATE INDEX idx_profile_account ON profile (account_id)');
        $this->addSql('CREATE INDEX idx_profile_guardian ON profile (guardian_id)');
        $this->addSql('CREATE UNIQUE INDEX uniq_profile_default_per_account ON profile (account_id) WHERE (is_default = true)');
        $this->addSql('CREATE INDEX IDX_8157AA0F8B224CA9 ON profile (avatar_media_id)');
        $this->addSql('CREATE TABLE profile_permission (id UUID NOT NULL, permission VARCHAR(30) NOT NULL, mode VARCHAR(20) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, profile_id UUID NOT NULL, updated_by_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX uniq_profile_permission ON profile_permission (profile_id, permission)');
        $this->addSql('CREATE INDEX IDX_2722A5F7CCFA12B8 ON profile_permission (profile_id)');
        $this->addSql('CREATE INDEX IDX_2722A5F7896DBBDE ON profile_permission (updated_by_id)');
        $this->addSql('ALTER TABLE approval_request ADD CONSTRAINT FK_AFD730D9ED442CF4 FOREIGN KEY (requester_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE approval_request ADD CONSTRAINT FK_AFD730D9BB23766C FOREIGN KEY (approver_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE media ADD CONSTRAINT FK_6A2CA10C7E3C61F9 FOREIGN KEY (owner_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE profile ADD CONSTRAINT FK_8157AA0F9B6B5FBA FOREIGN KEY (account_id) REFERENCES account (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE profile ADD CONSTRAINT FK_8157AA0F11CC8B0A FOREIGN KEY (guardian_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE profile ADD CONSTRAINT FK_8157AA0F8B224CA9 FOREIGN KEY (avatar_media_id) REFERENCES media (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE profile_permission ADD CONSTRAINT FK_2722A5F7CCFA12B8 FOREIGN KEY (profile_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE profile_permission ADD CONSTRAINT FK_2722A5F7896DBBDE FOREIGN KEY (updated_by_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');

        // --- Énumérations : varchar + CHECK (décision du 18/09) ------------
        $this->addSql("ALTER TABLE profile ADD CONSTRAINT chk_profile_type CHECK (type IN ('ADULT', 'CHILD', 'RELATIVE'))");
        $this->addSql("ALTER TABLE media ADD CONSTRAINT chk_media_kind CHECK (kind IN ('PHOTO', 'SCAN_CAPTURE', 'INSPIRATION'))");
        $permissions = "'ITEM_CREATE', 'GARMENT_MANAGE', 'COLLECTION_CREATE', 'MEDIA_UPLOAD', 'LOAN_BORROW', 'LOAN_LEND', 'SHARE_CREATE', 'FRIEND_ADD', 'COMMENT_WRITE', 'FOLLOW', 'PURCHASE', 'SELL'";
        $this->addSql("ALTER TABLE profile_permission ADD CONSTRAINT chk_profile_permission_permission CHECK (permission IN ($permissions))");
        $this->addSql("ALTER TABLE profile_permission ADD CONSTRAINT chk_profile_permission_mode CHECK (mode IN ('ALLOWED', 'DENIED', 'REQUIRES_APPROVAL'))");
        $this->addSql("ALTER TABLE approval_request ADD CONSTRAINT chk_approval_request_permission CHECK (permission IN ($permissions))");
        $this->addSql("ALTER TABLE approval_request ADD CONSTRAINT chk_approval_request_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'WITHDRAWN'))");
        $this->addSql("ALTER TABLE approval_request ADD CONSTRAINT chk_approval_request_subject_type CHECK (subject_type IS NULL OR subject_type IN ('PROFILE', 'ITEM', 'GARMENT', 'COLLECTION', 'SHARE', 'POST', 'LISTING'))");

        // --- Tutelle (MDD, « Les contraintes à poser ») --------------------
        // Un enfant a toujours un tuteur.
        $this->addSql("ALTER TABLE profile ADD CONSTRAINT chk_profile_child_has_guardian CHECK (type <> 'CHILD' OR guardian_id IS NOT NULL)");
        // Un profil n'est pas son propre tuteur.
        $this->addSql('ALTER TABLE profile ADD CONSTRAINT chk_profile_not_own_guardian CHECK (guardian_id IS NULL OR guardian_id <> id)');
        // Pas de date de naissance dans le futur.
        $this->addSql('ALTER TABLE profile ADD CONSTRAINT chk_profile_birth_in_past CHECK (date_of_birth < CURRENT_DATE)');

        // --- Cohérence locale ------------------------------------------------
        $this->addSql('ALTER TABLE media ADD CONSTRAINT chk_media_size_positive CHECK (size_bytes > 0)');
        // La cible d'une demande est entière ou absente, jamais à moitié.
        $this->addSql('ALTER TABLE approval_request ADD CONSTRAINT chk_approval_request_subject_pair CHECK ((subject_type IS NULL) = (subject_id IS NULL))');
        // Une demande close porte sa date de décision.
        $this->addSql("ALTER TABLE approval_request ADD CONSTRAINT chk_approval_request_decided CHECK ((status = 'PENDING') = (decided_at IS NULL))");
        // Un demandeur n'approuve pas sa propre demande.
        $this->addSql('ALTER TABLE approval_request ADD CONSTRAINT chk_approval_request_not_self CHECK (requester_id <> approver_id)');

        // --- Compte et profil fantômes --------------------------------------
        // Le mot de passe vide ne correspond à aucun hash : personne ne peut
        // s'y connecter. Le domaine .invalid est réservé (RFC 2606).
        $this->addSql("INSERT INTO account (id, email, password, roles, locale, created_at, updated_at) VALUES ('00000000-0000-7000-8000-000000000000', 'fantome@penderie.invalid', '', '[]', 'fr', now(), now())");
        $this->addSql("INSERT INTO profile (id, account_id, guardian_id, first_name, last_name, date_of_birth, username, display_name, type, is_default, created_at, updated_at) VALUES ('00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-000000000000', NULL, 'Profil', 'supprimé', '1900-01-01', 'profil.supprime', 'Profil supprimé', 'ADULT', true, now(), now())");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE approval_request DROP CONSTRAINT FK_AFD730D9ED442CF4');
        $this->addSql('ALTER TABLE approval_request DROP CONSTRAINT FK_AFD730D9BB23766C');
        $this->addSql('ALTER TABLE media DROP CONSTRAINT FK_6A2CA10C7E3C61F9');
        $this->addSql('ALTER TABLE profile DROP CONSTRAINT FK_8157AA0F9B6B5FBA');
        $this->addSql('ALTER TABLE profile DROP CONSTRAINT FK_8157AA0F11CC8B0A');
        $this->addSql('ALTER TABLE profile DROP CONSTRAINT FK_8157AA0F8B224CA9');
        $this->addSql('ALTER TABLE profile_permission DROP CONSTRAINT FK_2722A5F7CCFA12B8');
        $this->addSql('ALTER TABLE profile_permission DROP CONSTRAINT FK_2722A5F7896DBBDE');
        $this->addSql('DROP TABLE account');
        $this->addSql('DROP TABLE approval_request');
        $this->addSql('DROP TABLE media');
        $this->addSql('DROP TABLE profile');
        $this->addSql('DROP TABLE profile_permission');
    }
}
