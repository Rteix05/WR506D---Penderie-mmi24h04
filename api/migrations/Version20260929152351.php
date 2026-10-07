<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Référentiels du MDD V2 : catégories d'objets et de vêtements, échelles
 * de tailles, marques, couleurs et styles.
 *
 * Structure seulement : le contenu (catégories système, graduations,
 * marques de la liste prédéfinie…) est chargé par la commande idempotente
 * app:reference-data:load, qui peut être relancée sans risque.
 *
 * SQL des tables généré par doctrine:migrations:diff, complété à la main
 * par les CHECK (voir la migration Identité pour la raison).
 */
final class Version20260929152351 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Référentiels : item_category, garment_category, size_system, size_value, brand, color, style';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE brand (id UUID NOT NULL, name VARCHAR(80) NOT NULL, slug VARCHAR(80) NOT NULL, is_verified BOOLEAN NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, logo_media_id UUID DEFAULT NULL, created_by_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_1C52F958989D9B62 ON brand (slug)');
        $this->addSql('CREATE INDEX IDX_1C52F958BAAE86A3 ON brand (logo_media_id)');
        $this->addSql('CREATE INDEX IDX_1C52F958B03A8386 ON brand (created_by_id)');
        $this->addSql('CREATE TABLE color (id UUID NOT NULL, name VARCHAR(40) NOT NULL, hex VARCHAR(7) DEFAULT NULL, family VARCHAR(20) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_665648E95E237E06 ON color (name)');
        $this->addSql('CREATE INDEX idx_color_family ON color (family)');
        $this->addSql('CREATE TABLE garment_category (id UUID NOT NULL, name VARCHAR(80) NOT NULL, slug VARCHAR(80) NOT NULL, icon VARCHAR(50) DEFAULT NULL, is_system BOOLEAN NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, default_warmth VARCHAR(20) DEFAULT NULL, owner_id UUID DEFAULT NULL, parent_id UUID DEFAULT NULL, size_system_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_garment_category_parent ON garment_category (parent_id)');
        $this->addSql('CREATE UNIQUE INDEX uniq_garment_category_system_slug ON garment_category (slug) WHERE (owner_id IS NULL)');
        $this->addSql('CREATE UNIQUE INDEX uniq_garment_category_owner_slug ON garment_category (owner_id, slug) WHERE (owner_id IS NOT NULL)');
        $this->addSql('CREATE INDEX IDX_126CA6AF7E3C61F9 ON garment_category (owner_id)');
        $this->addSql('CREATE INDEX IDX_126CA6AF5FAE8ACE ON garment_category (size_system_id)');
        $this->addSql('CREATE TABLE item_category (id UUID NOT NULL, name VARCHAR(80) NOT NULL, slug VARCHAR(80) NOT NULL, icon VARCHAR(50) DEFAULT NULL, is_system BOOLEAN NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, owner_id UUID DEFAULT NULL, parent_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_item_category_parent ON item_category (parent_id)');
        $this->addSql('CREATE UNIQUE INDEX uniq_item_category_system_slug ON item_category (slug) WHERE (owner_id IS NULL)');
        $this->addSql('CREATE UNIQUE INDEX uniq_item_category_owner_slug ON item_category (owner_id, slug) WHERE (owner_id IS NOT NULL)');
        $this->addSql('CREATE INDEX IDX_6A41D10A7E3C61F9 ON item_category (owner_id)');
        $this->addSql('CREATE TABLE size_system (id UUID NOT NULL, code VARCHAR(20) NOT NULL, name VARCHAR(80) NOT NULL, unit VARCHAR(10) DEFAULT NULL, allows_free_text BOOLEAN NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_7121644677153098 ON size_system (code)');
        $this->addSql('CREATE TABLE size_value (id UUID NOT NULL, label VARCHAR(20) NOT NULL, sort_order INT NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, size_system_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_size_value_order ON size_value (size_system_id, sort_order)');
        $this->addSql('CREATE UNIQUE INDEX uniq_size_value_label ON size_value (size_system_id, label)');
        $this->addSql('CREATE INDEX IDX_CCA79A035FAE8ACE ON size_value (size_system_id)');
        $this->addSql('CREATE TABLE style (id UUID NOT NULL, slug VARCHAR(40) NOT NULL, name VARCHAR(40) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_33BDB86A989D9B62 ON style (slug)');
        $this->addSql('ALTER TABLE brand ADD CONSTRAINT FK_1C52F958BAAE86A3 FOREIGN KEY (logo_media_id) REFERENCES media (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE brand ADD CONSTRAINT FK_1C52F958B03A8386 FOREIGN KEY (created_by_id) REFERENCES profile (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment_category ADD CONSTRAINT FK_126CA6AF7E3C61F9 FOREIGN KEY (owner_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment_category ADD CONSTRAINT FK_126CA6AF727ACA70 FOREIGN KEY (parent_id) REFERENCES garment_category (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment_category ADD CONSTRAINT FK_126CA6AF5FAE8ACE FOREIGN KEY (size_system_id) REFERENCES size_system (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE item_category ADD CONSTRAINT FK_6A41D10A7E3C61F9 FOREIGN KEY (owner_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE item_category ADD CONSTRAINT FK_6A41D10A727ACA70 FOREIGN KEY (parent_id) REFERENCES item_category (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE size_value ADD CONSTRAINT FK_CCA79A035FAE8ACE FOREIGN KEY (size_system_id) REFERENCES size_system (id) ON DELETE CASCADE NOT DEFERRABLE');

        // --- Énumérations (varchar + CHECK) ----------------------------------
        $this->addSql("ALTER TABLE size_system ADD CONSTRAINT chk_size_system_code CHECK (code IN ('EU_SHOE', 'ALPHA', 'WAIST_LENGTH', 'FR_NUMERIC', 'COLLAR', 'BELT_CM', 'ONE_SIZE', 'KIDS_AGE'))");
        $this->addSql("ALTER TABLE garment_category ADD CONSTRAINT chk_garment_category_warmth CHECK (default_warmth IS NULL OR default_warmth IN ('VERY_LIGHT', 'LIGHT', 'MID', 'WARM', 'VERY_WARM'))");
        $this->addSql("ALTER TABLE color ADD CONSTRAINT chk_color_family CHECK (family IN ('BLACK', 'WHITE', 'GREY', 'BEIGE', 'BROWN', 'RED', 'PINK', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE', 'METALLIC', 'MULTI'))");

        // --- Catégories ---------------------------------------------------------
        foreach (['item_category', 'garment_category'] as $table) {
            // isSystem ⇔ owner nul : les deux informations ne divergent jamais.
            $this->addSql("ALTER TABLE $table ADD CONSTRAINT chk_{$table}_system_owner CHECK (is_system = (owner_id IS NULL))");
            $this->addSql("ALTER TABLE $table ADD CONSTRAINT chk_{$table}_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id)");
            $this->addSql("ALTER TABLE $table ADD CONSTRAINT chk_{$table}_slug CHECK (slug ~ '^[a-z0-9-]+$')");
        }

        // --- Cohérence ---------------------------------------------------------
        $this->addSql("ALTER TABLE color ADD CONSTRAINT chk_color_hex CHECK (hex IS NULL OR hex ~ '^#[0-9A-F]{6}$')");
        // Seul « Multicolore » n'a pas de teinte unique.
        $this->addSql("ALTER TABLE color ADD CONSTRAINT chk_color_hex_unless_multi CHECK (family = 'MULTI' OR hex IS NOT NULL)");
        $this->addSql("ALTER TABLE brand ADD CONSTRAINT chk_brand_slug CHECK (slug ~ '^[a-z0-9]+$')");
        $this->addSql("ALTER TABLE style ADD CONSTRAINT chk_style_slug CHECK (slug ~ '^[a-z0-9-]+$')");
        $this->addSql('ALTER TABLE size_value ADD CONSTRAINT chk_size_value_order CHECK (sort_order >= 0)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE brand DROP CONSTRAINT FK_1C52F958BAAE86A3');
        $this->addSql('ALTER TABLE brand DROP CONSTRAINT FK_1C52F958B03A8386');
        $this->addSql('ALTER TABLE garment_category DROP CONSTRAINT FK_126CA6AF7E3C61F9');
        $this->addSql('ALTER TABLE garment_category DROP CONSTRAINT FK_126CA6AF727ACA70');
        $this->addSql('ALTER TABLE garment_category DROP CONSTRAINT FK_126CA6AF5FAE8ACE');
        $this->addSql('ALTER TABLE item_category DROP CONSTRAINT FK_6A41D10A7E3C61F9');
        $this->addSql('ALTER TABLE item_category DROP CONSTRAINT FK_6A41D10A727ACA70');
        $this->addSql('ALTER TABLE size_value DROP CONSTRAINT FK_CCA79A035FAE8ACE');
        $this->addSql('DROP TABLE brand');
        $this->addSql('DROP TABLE color');
        $this->addSql('DROP TABLE garment_category');
        $this->addSql('DROP TABLE item_category');
        $this->addSql('DROP TABLE size_system');
        $this->addSql('DROP TABLE size_value');
        $this->addSql('DROP TABLE style');
    }
}
