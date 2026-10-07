<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Domaine « Lieux » du MDD V2 : Place ▸ Room ▸ Storage ▸ Box.
 * LocationHistory, qui vise un objet ou un vêtement, arrive avec
 * l'inventaire.
 *
 * Box est un conteneur typé (décision du 29/09), pas seulement un carton.
 *
 * SQL des tables généré par doctrine:migrations:diff, complété à la main
 * par les CHECK (voir la migration Identité pour la raison).
 *
 * ON DELETE : CASCADE en descendant la cascade (un logement vide emporte
 * ses pièces vides), SET NULL entre un conteneur et son rangement (le
 * conteneur reste dans la pièce), RESTRICT vers le profil propriétaire
 * (un logement est transféré au tuteur, jamais détruit en silence). Les
 * objets, avec l'inventaire, bloqueront la suppression d'une pièce non
 * vide.
 */
final class Version20260929150609 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Lieux : place, room, storage, box';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE box (id UUID NOT NULL, name VARCHAR(80) NOT NULL, type VARCHAR(20) NOT NULL, reference VARCHAR(100) DEFAULT NULL, is_sealed BOOLEAN NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, room_id UUID NOT NULL, storage_id UUID DEFAULT NULL, cover_media_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_box_room ON box (room_id)');
        $this->addSql('CREATE INDEX idx_box_reference ON box (reference)');
        $this->addSql('CREATE INDEX IDX_8A9483A5CC5DB90 ON box (storage_id)');
        $this->addSql('CREATE INDEX IDX_8A9483A329A1B2E ON box (cover_media_id)');
        $this->addSql('CREATE TABLE place (id UUID NOT NULL, name VARCHAR(80) NOT NULL, type VARCHAR(20) NOT NULL, address VARCHAR(255) DEFAULT NULL, description TEXT DEFAULT NULL, is_primary BOOLEAN NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, owner_id UUID NOT NULL, cover_media_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_place_owner ON place (owner_id)');
        $this->addSql('CREATE UNIQUE INDEX uniq_place_primary_per_owner ON place (owner_id) WHERE (is_primary = true)');
        $this->addSql('CREATE INDEX IDX_741D53CD329A1B2E ON place (cover_media_id)');
        $this->addSql('CREATE TABLE room (id UUID NOT NULL, name VARCHAR(80) NOT NULL, type VARCHAR(20) NOT NULL, position INT NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, place_id UUID NOT NULL, cover_media_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_room_place_position ON room (place_id, position)');
        $this->addSql('CREATE INDEX IDX_729F519BDA6A219 ON room (place_id)');
        $this->addSql('CREATE INDEX IDX_729F519B329A1B2E ON room (cover_media_id)');
        $this->addSql('CREATE TABLE storage (id UUID NOT NULL, name VARCHAR(80) NOT NULL, type VARCHAR(20) NOT NULL, position INT NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, room_id UUID NOT NULL, cover_media_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_storage_room_position ON storage (room_id, position)');
        $this->addSql('CREATE INDEX IDX_547A1B3454177093 ON storage (room_id)');
        $this->addSql('CREATE INDEX IDX_547A1B34329A1B2E ON storage (cover_media_id)');
        $this->addSql('ALTER TABLE box ADD CONSTRAINT FK_8A9483A54177093 FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE box ADD CONSTRAINT FK_8A9483A5CC5DB90 FOREIGN KEY (storage_id) REFERENCES storage (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE box ADD CONSTRAINT FK_8A9483A329A1B2E FOREIGN KEY (cover_media_id) REFERENCES media (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE place ADD CONSTRAINT FK_741D53CD7E3C61F9 FOREIGN KEY (owner_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE place ADD CONSTRAINT FK_741D53CD329A1B2E FOREIGN KEY (cover_media_id) REFERENCES media (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE room ADD CONSTRAINT FK_729F519BDA6A219 FOREIGN KEY (place_id) REFERENCES place (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE room ADD CONSTRAINT FK_729F519B329A1B2E FOREIGN KEY (cover_media_id) REFERENCES media (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE storage ADD CONSTRAINT FK_547A1B3454177093 FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE storage ADD CONSTRAINT FK_547A1B34329A1B2E FOREIGN KEY (cover_media_id) REFERENCES media (id) ON DELETE SET NULL NOT DEFERRABLE');

        // --- Énumérations (varchar + CHECK) ----------------------------------
        $this->addSql("ALTER TABLE place ADD CONSTRAINT chk_place_type CHECK (type IN ('HOUSE', 'APARTMENT', 'STORAGE_UNIT', 'OTHER'))");
        $this->addSql("ALTER TABLE room ADD CONSTRAINT chk_room_type CHECK (type IN ('LIVING_ROOM', 'BEDROOM', 'KITCHEN', 'BATHROOM', 'OFFICE', 'ENTRANCE', 'DRESSING', 'LAUNDRY', 'GARAGE', 'CELLAR', 'ATTIC', 'OTHER'))");
        $this->addSql("ALTER TABLE storage ADD CONSTRAINT chk_storage_type CHECK (type IN ('WARDROBE', 'CLOSET', 'SHELF', 'BOOKCASE', 'CABINET', 'DRESSER', 'DRAWER', 'RACK', 'CHEST', 'OTHER'))");
        $this->addSql("ALTER TABLE box ADD CONSTRAINT chk_box_type CHECK (type IN ('CARTON', 'SHELF', 'DRAWER', 'BIN', 'SUITCASE', 'BAG', 'OTHER'))");

        // --- Cohérence ---------------------------------------------------------
        // Seul un carton peut être scellé.
        $this->addSql("ALTER TABLE box ADD CONSTRAINT chk_box_sealed_only_carton CHECK (type = 'CARTON' OR is_sealed = false)");
        $this->addSql('ALTER TABLE room ADD CONSTRAINT chk_room_position CHECK (position >= 0)');
        $this->addSql('ALTER TABLE storage ADD CONSTRAINT chk_storage_position CHECK (position >= 0)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE box DROP CONSTRAINT FK_8A9483A54177093');
        $this->addSql('ALTER TABLE box DROP CONSTRAINT FK_8A9483A5CC5DB90');
        $this->addSql('ALTER TABLE box DROP CONSTRAINT FK_8A9483A329A1B2E');
        $this->addSql('ALTER TABLE place DROP CONSTRAINT FK_741D53CD7E3C61F9');
        $this->addSql('ALTER TABLE place DROP CONSTRAINT FK_741D53CD329A1B2E');
        $this->addSql('ALTER TABLE room DROP CONSTRAINT FK_729F519BDA6A219');
        $this->addSql('ALTER TABLE room DROP CONSTRAINT FK_729F519B329A1B2E');
        $this->addSql('ALTER TABLE storage DROP CONSTRAINT FK_547A1B3454177093');
        $this->addSql('ALTER TABLE storage DROP CONSTRAINT FK_547A1B34329A1B2E');
        $this->addSql('DROP TABLE box');
        $this->addSql('DROP TABLE place');
        $this->addSql('DROP TABLE room');
        $this->addSql('DROP TABLE storage');
    }
}
