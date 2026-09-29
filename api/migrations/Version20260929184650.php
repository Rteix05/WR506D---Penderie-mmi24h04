<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Domaine « Inventaire » du MDD V2 : Item, Garment (avec couleurs et
 * styles), leurs galeries ItemMedia / GarmentMedia, Scan et
 * LocationHistory.
 *
 * SQL des tables généré par doctrine:migrations:diff, complété à la main :
 *  - les extensions pg_trgm et unaccent, et une fonction penderie_unaccent
 *    IMMUTABLE (unaccent seule ne l'est pas, et un index l'exige) ;
 *  - les index de recherche du MDD, sur expression (Doctrine ne sait pas
 *    les déclarer, et ne cherche pas à les supprimer) :
 *      · recherche tolérante aux fautes (trigrammes) sur le nom ;
 *      · recherche plein texte, accents ignorés, sur nom + description ;
 *  - les CHECK (énumérations et cohérence).
 */
final class Version20260929184650 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Inventaire : item, garment, garment_color, garment_style, item_media, garment_media, scan, location_history';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE garment (id UUID NOT NULL, name VARCHAR(120) NOT NULL, description TEXT DEFAULT NULL, notes TEXT DEFAULT NULL, availability VARCHAR(20) NOT NULL, condition VARCHAR(20) DEFAULT NULL, purchase_date DATE DEFAULT NULL, estimated_value NUMERIC(10, 2) DEFAULT NULL, source VARCHAR(20) NOT NULL, scan_data JSONB DEFAULT NULL, deleted_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, size_label VARCHAR(20) DEFAULT NULL, usage VARCHAR(20) NOT NULL, warmth VARCHAR(20) DEFAULT NULL, water_resistant BOOLEAN NOT NULL, owner_id UUID NOT NULL, room_id UUID NOT NULL, storage_id UUID DEFAULT NULL, box_id UUID DEFAULT NULL, category_id UUID NOT NULL, brand_id UUID DEFAULT NULL, size_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_garment_owner_category_size ON garment (owner_id, category_id, size_id)');
        $this->addSql('CREATE INDEX idx_garment_owner_availability ON garment (owner_id, availability)');
        $this->addSql('CREATE INDEX idx_garment_room ON garment (room_id)');
        $this->addSql('CREATE INDEX idx_garment_box ON garment (box_id)');
        $this->addSql('CREATE INDEX IDX_B881175C7E3C61F9 ON garment (owner_id)');
        $this->addSql('CREATE INDEX IDX_B881175C5CC5DB90 ON garment (storage_id)');
        $this->addSql('CREATE INDEX IDX_B881175C12469DE2 ON garment (category_id)');
        $this->addSql('CREATE INDEX IDX_B881175C44F5D008 ON garment (brand_id)');
        $this->addSql('CREATE INDEX IDX_B881175C498DA827 ON garment (size_id)');
        $this->addSql('CREATE TABLE garment_color (garment_id UUID NOT NULL, color_id UUID NOT NULL, PRIMARY KEY (garment_id, color_id))');
        $this->addSql('CREATE INDEX IDX_DB4A599D9CDB257C ON garment_color (garment_id)');
        $this->addSql('CREATE INDEX IDX_DB4A599D7ADA1FB5 ON garment_color (color_id)');
        $this->addSql('CREATE TABLE garment_style (garment_id UUID NOT NULL, style_id UUID NOT NULL, PRIMARY KEY (garment_id, style_id))');
        $this->addSql('CREATE INDEX IDX_8EA1A91E9CDB257C ON garment_style (garment_id)');
        $this->addSql('CREATE INDEX IDX_8EA1A91EBACD6074 ON garment_style (style_id)');
        $this->addSql('CREATE TABLE garment_media (position INT NOT NULL, is_primary BOOLEAN NOT NULL, garment_id UUID NOT NULL, media_id UUID NOT NULL, PRIMARY KEY (garment_id, media_id))');
        $this->addSql('CREATE INDEX idx_garment_media_order ON garment_media (garment_id, position)');
        $this->addSql('CREATE UNIQUE INDEX uniq_garment_media_primary ON garment_media (garment_id) WHERE (is_primary = true)');
        $this->addSql('CREATE INDEX IDX_D730B0789CDB257C ON garment_media (garment_id)');
        $this->addSql('CREATE INDEX IDX_D730B078EA9FDD75 ON garment_media (media_id)');
        $this->addSql('CREATE TABLE item (id UUID NOT NULL, name VARCHAR(120) NOT NULL, description TEXT DEFAULT NULL, notes TEXT DEFAULT NULL, availability VARCHAR(20) NOT NULL, condition VARCHAR(20) DEFAULT NULL, purchase_date DATE DEFAULT NULL, estimated_value NUMERIC(10, 2) DEFAULT NULL, source VARCHAR(20) NOT NULL, scan_data JSONB DEFAULT NULL, deleted_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, owner_id UUID NOT NULL, room_id UUID NOT NULL, storage_id UUID DEFAULT NULL, box_id UUID DEFAULT NULL, category_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_item_owner_availability ON item (owner_id, availability)');
        $this->addSql('CREATE INDEX idx_item_room ON item (room_id)');
        $this->addSql('CREATE INDEX idx_item_box ON item (box_id)');
        $this->addSql('CREATE INDEX IDX_1F1B251E7E3C61F9 ON item (owner_id)');
        $this->addSql('CREATE INDEX IDX_1F1B251E5CC5DB90 ON item (storage_id)');
        $this->addSql('CREATE INDEX IDX_1F1B251E12469DE2 ON item (category_id)');
        $this->addSql('CREATE TABLE item_media (position INT NOT NULL, is_primary BOOLEAN NOT NULL, item_id UUID NOT NULL, media_id UUID NOT NULL, PRIMARY KEY (item_id, media_id))');
        $this->addSql('CREATE INDEX idx_item_media_order ON item_media (item_id, position)');
        $this->addSql('CREATE UNIQUE INDEX uniq_item_media_primary ON item_media (item_id) WHERE (is_primary = true)');
        $this->addSql('CREATE INDEX IDX_408BBADC126F525E ON item_media (item_id)');
        $this->addSql('CREATE INDEX IDX_408BBADCEA9FDD75 ON item_media (media_id)');
        $this->addSql('CREATE TABLE location_history (id UUID NOT NULL, reason VARCHAR(20) NOT NULL, moved_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, item_id UUID DEFAULT NULL, garment_id UUID DEFAULT NULL, room_id UUID NOT NULL, storage_id UUID DEFAULT NULL, box_id UUID DEFAULT NULL, moved_by_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_location_history_item ON location_history (item_id, moved_at)');
        $this->addSql('CREATE INDEX idx_location_history_garment ON location_history (garment_id, moved_at)');
        $this->addSql('CREATE INDEX IDX_C9FF63EF126F525E ON location_history (item_id)');
        $this->addSql('CREATE INDEX IDX_C9FF63EF9CDB257C ON location_history (garment_id)');
        $this->addSql('CREATE INDEX IDX_C9FF63EF54177093 ON location_history (room_id)');
        $this->addSql('CREATE INDEX IDX_C9FF63EF5CC5DB90 ON location_history (storage_id)');
        $this->addSql('CREATE INDEX IDX_C9FF63EFD8177B3F ON location_history (box_id)');
        $this->addSql('CREATE INDEX IDX_C9FF63EF257D2463 ON location_history (moved_by_id)');
        $this->addSql('CREATE TABLE scan (id UUID NOT NULL, kind VARCHAR(20) NOT NULL, code VARCHAR(255) DEFAULT NULL, status VARCHAR(20) NOT NULL, provider VARCHAR(50) DEFAULT NULL, raw_data JSONB DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, profile_id UUID NOT NULL, media_id UUID DEFAULT NULL, resulting_item_id UUID DEFAULT NULL, resulting_garment_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_scan_profile_created ON scan (profile_id, created_at)');
        $this->addSql('CREATE INDEX idx_scan_kind_status ON scan (kind, status)');
        $this->addSql('CREATE INDEX IDX_C4B3B3AECCFA12B8 ON scan (profile_id)');
        $this->addSql('CREATE INDEX IDX_C4B3B3AEEA9FDD75 ON scan (media_id)');
        $this->addSql('CREATE INDEX IDX_C4B3B3AE2F275712 ON scan (resulting_item_id)');
        $this->addSql('CREATE INDEX IDX_C4B3B3AEE02B6C02 ON scan (resulting_garment_id)');
        $this->addSql('ALTER TABLE garment ADD CONSTRAINT FK_B881175C7E3C61F9 FOREIGN KEY (owner_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment ADD CONSTRAINT FK_B881175C54177093 FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment ADD CONSTRAINT FK_B881175C5CC5DB90 FOREIGN KEY (storage_id) REFERENCES storage (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment ADD CONSTRAINT FK_B881175CD8177B3F FOREIGN KEY (box_id) REFERENCES box (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment ADD CONSTRAINT FK_B881175C12469DE2 FOREIGN KEY (category_id) REFERENCES garment_category (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment ADD CONSTRAINT FK_B881175C44F5D008 FOREIGN KEY (brand_id) REFERENCES brand (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment ADD CONSTRAINT FK_B881175C498DA827 FOREIGN KEY (size_id) REFERENCES size_value (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment_color ADD CONSTRAINT FK_DB4A599D9CDB257C FOREIGN KEY (garment_id) REFERENCES garment (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment_color ADD CONSTRAINT FK_DB4A599D7ADA1FB5 FOREIGN KEY (color_id) REFERENCES color (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment_style ADD CONSTRAINT FK_8EA1A91E9CDB257C FOREIGN KEY (garment_id) REFERENCES garment (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment_style ADD CONSTRAINT FK_8EA1A91EBACD6074 FOREIGN KEY (style_id) REFERENCES style (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment_media ADD CONSTRAINT FK_D730B0789CDB257C FOREIGN KEY (garment_id) REFERENCES garment (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment_media ADD CONSTRAINT FK_D730B078EA9FDD75 FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE item ADD CONSTRAINT FK_1F1B251E7E3C61F9 FOREIGN KEY (owner_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE item ADD CONSTRAINT FK_1F1B251E54177093 FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE item ADD CONSTRAINT FK_1F1B251E5CC5DB90 FOREIGN KEY (storage_id) REFERENCES storage (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE item ADD CONSTRAINT FK_1F1B251ED8177B3F FOREIGN KEY (box_id) REFERENCES box (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE item ADD CONSTRAINT FK_1F1B251E12469DE2 FOREIGN KEY (category_id) REFERENCES item_category (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE item_media ADD CONSTRAINT FK_408BBADC126F525E FOREIGN KEY (item_id) REFERENCES item (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE item_media ADD CONSTRAINT FK_408BBADCEA9FDD75 FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE location_history ADD CONSTRAINT FK_C9FF63EF126F525E FOREIGN KEY (item_id) REFERENCES item (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE location_history ADD CONSTRAINT FK_C9FF63EF9CDB257C FOREIGN KEY (garment_id) REFERENCES garment (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE location_history ADD CONSTRAINT FK_C9FF63EF54177093 FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE location_history ADD CONSTRAINT FK_C9FF63EF5CC5DB90 FOREIGN KEY (storage_id) REFERENCES storage (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE location_history ADD CONSTRAINT FK_C9FF63EFD8177B3F FOREIGN KEY (box_id) REFERENCES box (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE location_history ADD CONSTRAINT FK_C9FF63EF257D2463 FOREIGN KEY (moved_by_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE scan ADD CONSTRAINT FK_C4B3B3AECCFA12B8 FOREIGN KEY (profile_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE scan ADD CONSTRAINT FK_C4B3B3AEEA9FDD75 FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE scan ADD CONSTRAINT FK_C4B3B3AE2F275712 FOREIGN KEY (resulting_item_id) REFERENCES item (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE scan ADD CONSTRAINT FK_C4B3B3AEE02B6C02 FOREIGN KEY (resulting_garment_id) REFERENCES garment (id) ON DELETE SET NULL NOT DEFERRABLE');

        // --- Recherche --------------------------------------------------------
        $this->addSql('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        $this->addSql('CREATE EXTENSION IF NOT EXISTS unaccent');
        // unaccent() n'est pas IMMUTABLE (son dictionnaire pourrait changer) : un
        // index ne peut pas l'appeler directement. On fige le dictionnaire.
        $this->addSql("CREATE OR REPLACE FUNCTION penderie_unaccent(text) RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS \$\$ SELECT public.unaccent('public.unaccent'::regdictionary, \$1) \$\$");
        foreach (['item', 'garment'] as $table) {
            // « perseuse » trouve « Perceuse Bosch » : similarité de trigrammes.
            $this->addSql("CREATE INDEX idx_{$table}_name_trgm ON $table USING gin (penderie_unaccent(lower(name)) gin_trgm_ops)");
            // Recherche plein texte en français, accents ignorés.
            $this->addSql("CREATE INDEX idx_{$table}_fulltext ON $table USING gin (to_tsvector('french', penderie_unaccent(name || ' ' || coalesce(description, ''))))");
        }

        // --- Item et Garment ------------------------------------------------------
        foreach (['item', 'garment'] as $table) {
            $this->addSql("ALTER TABLE $table ADD CONSTRAINT chk_{$table}_availability CHECK (availability IN ('AVAILABLE', 'LENT', 'BORROWED', 'LOST', 'SOLD'))");
            $this->addSql("ALTER TABLE $table ADD CONSTRAINT chk_{$table}_condition CHECK (condition IS NULL OR condition IN ('NEW', 'EXCELLENT', 'GOOD', 'WORN', 'DAMAGED'))");
            $this->addSql("ALTER TABLE $table ADD CONSTRAINT chk_{$table}_source CHECK (source IN ('MANUAL', 'SCAN'))");
            // Les données de scan n'existent que pour un objet issu d'un scan.
            $this->addSql("ALTER TABLE $table ADD CONSTRAINT chk_{$table}_scan_data CHECK (source = 'SCAN' OR scan_data IS NULL)");
            $this->addSql("ALTER TABLE $table ADD CONSTRAINT chk_{$table}_value CHECK (estimated_value IS NULL OR estimated_value >= 0)");
            $this->addSql("ALTER TABLE $table ADD CONSTRAINT chk_{$table}_purchase_date CHECK (purchase_date IS NULL OR purchase_date <= CURRENT_DATE)");
        }
        $this->addSql("ALTER TABLE garment ADD CONSTRAINT chk_garment_usage CHECK (usage IN ('EVERYDAY', 'WORK', 'SPORT', 'EVENING'))");
        $this->addSql("ALTER TABLE garment ADD CONSTRAINT chk_garment_warmth CHECK (warmth IS NULL OR warmth IN ('VERY_LIGHT', 'LIGHT', 'MID', 'WARM', 'VERY_WARM'))");
        // Une graduation de l'échelle OU un texte libre, jamais les deux.
        $this->addSql('ALTER TABLE garment ADD CONSTRAINT chk_garment_one_size CHECK (size_id IS NULL OR size_label IS NULL)');

        // --- Galeries -------------------------------------------------------------
        $this->addSql('ALTER TABLE item_media ADD CONSTRAINT chk_item_media_position CHECK (position >= 0)');
        $this->addSql('ALTER TABLE garment_media ADD CONSTRAINT chk_garment_media_position CHECK (position >= 0)');

        // --- LocationHistory --------------------------------------------------------
        // Exactement un objet OU un vêtement (règle « une clé sur deux » du MDD).
        $this->addSql('ALTER TABLE location_history ADD CONSTRAINT chk_location_history_target CHECK ((item_id IS NULL) <> (garment_id IS NULL))');
        $this->addSql("ALTER TABLE location_history ADD CONSTRAINT chk_location_history_reason CHECK (reason IN ('MANUAL_MOVE', 'BOX_MOVED', 'LOAN_RETURN', 'INITIAL'))");

        // --- Scan -----------------------------------------------------------------
        $this->addSql("ALTER TABLE scan ADD CONSTRAINT chk_scan_kind CHECK (kind IN ('BARCODE', 'QRCODE', 'PHOTO', 'LABEL_OCR'))");
        $this->addSql("ALTER TABLE scan ADD CONSTRAINT chk_scan_status CHECK (status IN ('SUCCESS', 'PARTIAL', 'FAILED'))");
        // Au plus un résultat, et aucun pour un scan échoué.
        $this->addSql('ALTER TABLE scan ADD CONSTRAINT chk_scan_one_result CHECK (resulting_item_id IS NULL OR resulting_garment_id IS NULL)');
        $this->addSql("ALTER TABLE scan ADD CONSTRAINT chk_scan_failed_no_result CHECK (status <> 'FAILED' OR (resulting_item_id IS NULL AND resulting_garment_id IS NULL))");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE garment DROP CONSTRAINT FK_B881175C7E3C61F9');
        $this->addSql('ALTER TABLE garment DROP CONSTRAINT FK_B881175C54177093');
        $this->addSql('ALTER TABLE garment DROP CONSTRAINT FK_B881175C5CC5DB90');
        $this->addSql('ALTER TABLE garment DROP CONSTRAINT FK_B881175CD8177B3F');
        $this->addSql('ALTER TABLE garment DROP CONSTRAINT FK_B881175C12469DE2');
        $this->addSql('ALTER TABLE garment DROP CONSTRAINT FK_B881175C44F5D008');
        $this->addSql('ALTER TABLE garment DROP CONSTRAINT FK_B881175C498DA827');
        $this->addSql('ALTER TABLE garment_color DROP CONSTRAINT FK_DB4A599D9CDB257C');
        $this->addSql('ALTER TABLE garment_color DROP CONSTRAINT FK_DB4A599D7ADA1FB5');
        $this->addSql('ALTER TABLE garment_style DROP CONSTRAINT FK_8EA1A91E9CDB257C');
        $this->addSql('ALTER TABLE garment_style DROP CONSTRAINT FK_8EA1A91EBACD6074');
        $this->addSql('ALTER TABLE garment_media DROP CONSTRAINT FK_D730B0789CDB257C');
        $this->addSql('ALTER TABLE garment_media DROP CONSTRAINT FK_D730B078EA9FDD75');
        $this->addSql('ALTER TABLE item DROP CONSTRAINT FK_1F1B251E7E3C61F9');
        $this->addSql('ALTER TABLE item DROP CONSTRAINT FK_1F1B251E54177093');
        $this->addSql('ALTER TABLE item DROP CONSTRAINT FK_1F1B251E5CC5DB90');
        $this->addSql('ALTER TABLE item DROP CONSTRAINT FK_1F1B251ED8177B3F');
        $this->addSql('ALTER TABLE item DROP CONSTRAINT FK_1F1B251E12469DE2');
        $this->addSql('ALTER TABLE item_media DROP CONSTRAINT FK_408BBADC126F525E');
        $this->addSql('ALTER TABLE item_media DROP CONSTRAINT FK_408BBADCEA9FDD75');
        $this->addSql('ALTER TABLE location_history DROP CONSTRAINT FK_C9FF63EF126F525E');
        $this->addSql('ALTER TABLE location_history DROP CONSTRAINT FK_C9FF63EF9CDB257C');
        $this->addSql('ALTER TABLE location_history DROP CONSTRAINT FK_C9FF63EF54177093');
        $this->addSql('ALTER TABLE location_history DROP CONSTRAINT FK_C9FF63EF5CC5DB90');
        $this->addSql('ALTER TABLE location_history DROP CONSTRAINT FK_C9FF63EFD8177B3F');
        $this->addSql('ALTER TABLE location_history DROP CONSTRAINT FK_C9FF63EF257D2463');
        $this->addSql('ALTER TABLE scan DROP CONSTRAINT FK_C4B3B3AECCFA12B8');
        $this->addSql('ALTER TABLE scan DROP CONSTRAINT FK_C4B3B3AEEA9FDD75');
        $this->addSql('ALTER TABLE scan DROP CONSTRAINT FK_C4B3B3AE2F275712');
        $this->addSql('ALTER TABLE scan DROP CONSTRAINT FK_C4B3B3AEE02B6C02');
        $this->addSql('DROP TABLE garment');
        $this->addSql('DROP TABLE garment_color');
        $this->addSql('DROP TABLE garment_style');
        $this->addSql('DROP TABLE garment_media');
        $this->addSql('DROP TABLE item');
        $this->addSql('DROP TABLE item_media');
        $this->addSql('DROP TABLE location_history');
        $this->addSql('DROP TABLE scan');
        $this->addSql('DROP FUNCTION IF EXISTS penderie_unaccent(text)');
        // Les extensions pg_trgm et unaccent restent : d'autres objets peuvent s'en servir.
    }
}
