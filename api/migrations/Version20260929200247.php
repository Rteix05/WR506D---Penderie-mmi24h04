<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Domaine « Dressing & tenues » du MDD V2 : Outfit (et ses pièces),
 * OutfitSuggestion (et ses pièces), WearLog, GarmentVisibilityPreference,
 * GarmentExclusion, ColorPreference, StylePreference.
 *
 * SQL des tables généré par doctrine:migrations:diff, complété à la main :
 *  - les CHECK (énumérations, cohérence des dates et des sources, au
 *    moins un critère de masquage) ;
 *  - trois index uniques sur expression (COALESCE) : les règles d'unicité
 *    du MDD portent sur des colonnes facultatives, et un index unique
 *    ordinaire laisse passer les doublons qui ne diffèrent que par NULL.
 *
 * Suppression d'un profil : ses suggestions, son historique de port, ses
 * exclusions et ses préférences partent avec lui (CASCADE, MDD) ; ses
 * tenues sont transférées au tuteur (RESTRICT).
 */
final class Version20260929200247 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Dressing : outfit, outfit_garment, outfit_suggestion, outfit_suggestion_garment, wear_log, garment_visibility_preference, garment_exclusion, color_preference, style_preference';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE color_preference (id UUID NOT NULL, sentiment VARCHAR(10) NOT NULL, context VARCHAR(20) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, profile_id UUID NOT NULL, color_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_color_pref_profile ON color_preference (profile_id)');
        $this->addSql('CREATE INDEX IDX_F8FB0B9D7ADA1FB5 ON color_preference (color_id)');
        $this->addSql('CREATE TABLE garment_exclusion (id UUID NOT NULL, reason TEXT DEFAULT NULL, excluded_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, reactivated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, profile_id UUID NOT NULL, garment_id UUID NOT NULL, from_suggestion_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX uniq_garment_exclusion_active ON garment_exclusion (profile_id, garment_id) WHERE (reactivated_at IS NULL)');
        $this->addSql('CREATE INDEX IDX_A7EF048CCCFA12B8 ON garment_exclusion (profile_id)');
        $this->addSql('CREATE INDEX IDX_A7EF048C9CDB257C ON garment_exclusion (garment_id)');
        $this->addSql('CREATE INDEX IDX_A7EF048CED4FB9B5 ON garment_exclusion (from_suggestion_id)');
        $this->addSql('CREATE TABLE garment_visibility_preference (id UUID NOT NULL, hidden_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, reactivated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, profile_id UUID NOT NULL, garment_category_id UUID DEFAULT NULL, color_id UUID DEFAULT NULL, style_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_visibility_pref_profile ON garment_visibility_preference (profile_id)');
        $this->addSql('CREATE INDEX IDX_26026A3383CE963 ON garment_visibility_preference (garment_category_id)');
        $this->addSql('CREATE INDEX IDX_26026A337ADA1FB5 ON garment_visibility_preference (color_id)');
        $this->addSql('CREATE INDEX IDX_26026A33BACD6074 ON garment_visibility_preference (style_id)');
        $this->addSql('CREATE TABLE outfit (id UUID NOT NULL, name VARCHAR(120) NOT NULL, occasion VARCHAR(20) NOT NULL, season VARCHAR(20) DEFAULT NULL, source VARCHAR(20) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, owner_id UUID NOT NULL, from_suggestion_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_32029601ED4FB9B5 ON outfit (from_suggestion_id)');
        $this->addSql('CREATE INDEX idx_outfit_owner ON outfit (owner_id)');
        $this->addSql('CREATE TABLE outfit_garment (position INT NOT NULL, outfit_id UUID NOT NULL, garment_id UUID NOT NULL, PRIMARY KEY (outfit_id, garment_id))');
        $this->addSql('CREATE INDEX IDX_1A52FF54AE96E385 ON outfit_garment (outfit_id)');
        $this->addSql('CREATE INDEX IDX_1A52FF549CDB257C ON outfit_garment (garment_id)');
        $this->addSql('CREATE TABLE outfit_suggestion (id UUID NOT NULL, occasion VARCHAR(20) NOT NULL, temperature SMALLINT DEFAULT NULL, weather VARCHAR(20) DEFAULT NULL, status VARCHAR(20) NOT NULL, generated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, decided_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, profile_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_outfit_suggestion_profile_generated ON outfit_suggestion (profile_id, generated_at)');
        $this->addSql('CREATE INDEX idx_outfit_suggestion_status ON outfit_suggestion (status)');
        $this->addSql('CREATE INDEX IDX_5AEE588BCCFA12B8 ON outfit_suggestion (profile_id)');
        $this->addSql('CREATE TABLE outfit_suggestion_garment (position INT NOT NULL, was_replaced BOOLEAN NOT NULL, suggestion_id UUID NOT NULL, garment_id UUID NOT NULL, PRIMARY KEY (suggestion_id, garment_id))');
        $this->addSql('CREATE INDEX IDX_8C4F65E5A41BB822 ON outfit_suggestion_garment (suggestion_id)');
        $this->addSql('CREATE INDEX IDX_8C4F65E59CDB257C ON outfit_suggestion_garment (garment_id)');
        $this->addSql('CREATE TABLE style_preference (id UUID NOT NULL, sentiment VARCHAR(10) NOT NULL, context VARCHAR(20) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, profile_id UUID NOT NULL, style_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_style_pref_profile ON style_preference (profile_id)');
        $this->addSql('CREATE INDEX IDX_A311360EBACD6074 ON style_preference (style_id)');
        $this->addSql('CREATE TABLE wear_log (id UUID NOT NULL, worn_at DATE NOT NULL, garment_id UUID NOT NULL, profile_id UUID NOT NULL, outfit_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_wear_log_garment_worn ON wear_log (garment_id, worn_at)');
        $this->addSql('CREATE INDEX idx_wear_log_profile_worn ON wear_log (profile_id, worn_at)');
        $this->addSql('CREATE UNIQUE INDEX uniq_wear_log_day ON wear_log (garment_id, profile_id, worn_at)');
        $this->addSql('CREATE INDEX IDX_B993E5D19CDB257C ON wear_log (garment_id)');
        $this->addSql('CREATE INDEX IDX_B993E5D1CCFA12B8 ON wear_log (profile_id)');
        $this->addSql('CREATE INDEX IDX_B993E5D1AE96E385 ON wear_log (outfit_id)');
        $this->addSql('ALTER TABLE color_preference ADD CONSTRAINT FK_F8FB0B9DCCFA12B8 FOREIGN KEY (profile_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE color_preference ADD CONSTRAINT FK_F8FB0B9D7ADA1FB5 FOREIGN KEY (color_id) REFERENCES color (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment_exclusion ADD CONSTRAINT FK_A7EF048CCCFA12B8 FOREIGN KEY (profile_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment_exclusion ADD CONSTRAINT FK_A7EF048C9CDB257C FOREIGN KEY (garment_id) REFERENCES garment (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment_exclusion ADD CONSTRAINT FK_A7EF048CED4FB9B5 FOREIGN KEY (from_suggestion_id) REFERENCES outfit_suggestion (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment_visibility_preference ADD CONSTRAINT FK_26026A33CCFA12B8 FOREIGN KEY (profile_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment_visibility_preference ADD CONSTRAINT FK_26026A3383CE963 FOREIGN KEY (garment_category_id) REFERENCES garment_category (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment_visibility_preference ADD CONSTRAINT FK_26026A337ADA1FB5 FOREIGN KEY (color_id) REFERENCES color (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE garment_visibility_preference ADD CONSTRAINT FK_26026A33BACD6074 FOREIGN KEY (style_id) REFERENCES style (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE outfit ADD CONSTRAINT FK_320296017E3C61F9 FOREIGN KEY (owner_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE outfit ADD CONSTRAINT FK_32029601ED4FB9B5 FOREIGN KEY (from_suggestion_id) REFERENCES outfit_suggestion (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE outfit_garment ADD CONSTRAINT FK_1A52FF54AE96E385 FOREIGN KEY (outfit_id) REFERENCES outfit (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE outfit_garment ADD CONSTRAINT FK_1A52FF549CDB257C FOREIGN KEY (garment_id) REFERENCES garment (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE outfit_suggestion ADD CONSTRAINT FK_5AEE588BCCFA12B8 FOREIGN KEY (profile_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE outfit_suggestion_garment ADD CONSTRAINT FK_8C4F65E5A41BB822 FOREIGN KEY (suggestion_id) REFERENCES outfit_suggestion (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE outfit_suggestion_garment ADD CONSTRAINT FK_8C4F65E59CDB257C FOREIGN KEY (garment_id) REFERENCES garment (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE style_preference ADD CONSTRAINT FK_A311360ECCFA12B8 FOREIGN KEY (profile_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE style_preference ADD CONSTRAINT FK_A311360EBACD6074 FOREIGN KEY (style_id) REFERENCES style (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE wear_log ADD CONSTRAINT FK_B993E5D19CDB257C FOREIGN KEY (garment_id) REFERENCES garment (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE wear_log ADD CONSTRAINT FK_B993E5D1CCFA12B8 FOREIGN KEY (profile_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE wear_log ADD CONSTRAINT FK_B993E5D1AE96E385 FOREIGN KEY (outfit_id) REFERENCES outfit (id) ON DELETE SET NULL NOT DEFERRABLE');

        // --- Énumérations ----------------------------------------------------------------
        $occasions = "'EVERYDAY', 'WORK', 'SPORT', 'EVENING'";
        $this->addSql("ALTER TABLE outfit ADD CONSTRAINT chk_outfit_occasion CHECK (occasion IN ($occasions))");
        $this->addSql("ALTER TABLE outfit ADD CONSTRAINT chk_outfit_season CHECK (season IS NULL OR season IN ('SPRING', 'SUMMER', 'AUTUMN', 'WINTER'))");
        $this->addSql("ALTER TABLE outfit ADD CONSTRAINT chk_outfit_source CHECK (source IN ('MANUAL', 'FROM_SUGGESTION'))");
        $this->addSql("ALTER TABLE outfit_suggestion ADD CONSTRAINT chk_outfit_suggestion_occasion CHECK (occasion IN ($occasions))");
        $this->addSql("ALTER TABLE outfit_suggestion ADD CONSTRAINT chk_outfit_suggestion_weather CHECK (weather IS NULL OR weather IN ('SUNNY', 'CLOUDY', 'RAIN', 'SNOW', 'WIND'))");
        $this->addSql("ALTER TABLE outfit_suggestion ADD CONSTRAINT chk_outfit_suggestion_status CHECK (status IN ('PROPOSED', 'ACCEPTED', 'REJECTED', 'REPLACED'))");
        foreach (['color_preference', 'style_preference'] as $table) {
            $this->addSql("ALTER TABLE $table ADD CONSTRAINT chk_{$table}_sentiment CHECK (sentiment IN ('LIKE', 'DISLIKE'))");
            $this->addSql("ALTER TABLE $table ADD CONSTRAINT chk_{$table}_context CHECK (context IS NULL OR context IN ($occasions))");
        }

        // --- Cohérence ---------------------------------------------------------------------
        // Une tenue issue d'une suggestion la référence, une tenue manuelle non.
        $this->addSql("ALTER TABLE outfit ADD CONSTRAINT chk_outfit_source_suggestion CHECK (source = 'FROM_SUGGESTION' OR from_suggestion_id IS NULL)");
        // Une suggestion décidée porte sa date de décision, une suggestion en cours non.
        $this->addSql("ALTER TABLE outfit_suggestion ADD CONSTRAINT chk_outfit_suggestion_decided CHECK ((status = 'PROPOSED') = (decided_at IS NULL))");
        $this->addSql('ALTER TABLE outfit_suggestion ADD CONSTRAINT chk_outfit_suggestion_temperature CHECK (temperature IS NULL OR temperature BETWEEN -60 AND 60)');
        $this->addSql('ALTER TABLE outfit_garment ADD CONSTRAINT chk_outfit_garment_position CHECK (position >= 0)');
        $this->addSql('ALTER TABLE outfit_suggestion_garment ADD CONSTRAINT chk_outfit_suggestion_garment_position CHECK (position >= 0)');
        $this->addSql('ALTER TABLE wear_log ADD CONSTRAINT chk_wear_log_past CHECK (worn_at <= CURRENT_DATE)');
        // Une règle de masquage a au moins un critère (MDD).
        $this->addSql('ALTER TABLE garment_visibility_preference ADD CONSTRAINT chk_visibility_pref_criterion CHECK (garment_category_id IS NOT NULL OR color_id IS NOT NULL OR style_id IS NOT NULL)');
        $this->addSql('ALTER TABLE garment_exclusion ADD CONSTRAINT chk_garment_exclusion_dates CHECK (reactivated_at IS NULL OR reactivated_at >= excluded_at)');

        // --- Unicité sur des colonnes facultatives -------------------------------------------
        // Un index unique ordinaire laisse passer deux lignes qui ne diffèrent que par des NULL
        // (deux NULL ne sont jamais égaux) : on compare donc des valeurs COALESCE. TOUS les
        // éléments sont des expressions, même les colonnes obligatoires : un index qui mêle
        // colonnes simples et expressions, Doctrine le prend pour le sien et veut le supprimer.
        $none = "'00000000-0000-0000-0000-000000000000'::uuid";
        // Pas deux fois la même règle de masquage active ; les règles levées restent en base.
        $this->addSql("CREATE UNIQUE INDEX uniq_visibility_pref_active ON garment_visibility_preference (COALESCE(profile_id, $none), COALESCE(garment_category_id, $none), COALESCE(color_id, $none), COALESCE(style_id, $none)) WHERE reactivated_at IS NULL");
        // Une préférence par (profil, couleur ou style, contexte), contexte « toujours » compris.
        $this->addSql("CREATE UNIQUE INDEX uniq_color_preference ON color_preference (COALESCE(profile_id, $none), COALESCE(color_id, $none), COALESCE(context, ''))");
        $this->addSql("CREATE UNIQUE INDEX uniq_style_preference ON style_preference (COALESCE(profile_id, $none), COALESCE(style_id, $none), COALESCE(context, ''))");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE color_preference DROP CONSTRAINT FK_F8FB0B9DCCFA12B8');
        $this->addSql('ALTER TABLE color_preference DROP CONSTRAINT FK_F8FB0B9D7ADA1FB5');
        $this->addSql('ALTER TABLE garment_exclusion DROP CONSTRAINT FK_A7EF048CCCFA12B8');
        $this->addSql('ALTER TABLE garment_exclusion DROP CONSTRAINT FK_A7EF048C9CDB257C');
        $this->addSql('ALTER TABLE garment_exclusion DROP CONSTRAINT FK_A7EF048CED4FB9B5');
        $this->addSql('ALTER TABLE garment_visibility_preference DROP CONSTRAINT FK_26026A33CCFA12B8');
        $this->addSql('ALTER TABLE garment_visibility_preference DROP CONSTRAINT FK_26026A3383CE963');
        $this->addSql('ALTER TABLE garment_visibility_preference DROP CONSTRAINT FK_26026A337ADA1FB5');
        $this->addSql('ALTER TABLE garment_visibility_preference DROP CONSTRAINT FK_26026A33BACD6074');
        $this->addSql('ALTER TABLE outfit DROP CONSTRAINT FK_320296017E3C61F9');
        $this->addSql('ALTER TABLE outfit DROP CONSTRAINT FK_32029601ED4FB9B5');
        $this->addSql('ALTER TABLE outfit_garment DROP CONSTRAINT FK_1A52FF54AE96E385');
        $this->addSql('ALTER TABLE outfit_garment DROP CONSTRAINT FK_1A52FF549CDB257C');
        $this->addSql('ALTER TABLE outfit_suggestion DROP CONSTRAINT FK_5AEE588BCCFA12B8');
        $this->addSql('ALTER TABLE outfit_suggestion_garment DROP CONSTRAINT FK_8C4F65E5A41BB822');
        $this->addSql('ALTER TABLE outfit_suggestion_garment DROP CONSTRAINT FK_8C4F65E59CDB257C');
        $this->addSql('ALTER TABLE style_preference DROP CONSTRAINT FK_A311360ECCFA12B8');
        $this->addSql('ALTER TABLE style_preference DROP CONSTRAINT FK_A311360EBACD6074');
        $this->addSql('ALTER TABLE wear_log DROP CONSTRAINT FK_B993E5D19CDB257C');
        $this->addSql('ALTER TABLE wear_log DROP CONSTRAINT FK_B993E5D1CCFA12B8');
        $this->addSql('ALTER TABLE wear_log DROP CONSTRAINT FK_B993E5D1AE96E385');
        $this->addSql('DROP TABLE color_preference');
        $this->addSql('DROP TABLE garment_exclusion');
        $this->addSql('DROP TABLE garment_visibility_preference');
        $this->addSql('DROP TABLE outfit');
        $this->addSql('DROP TABLE outfit_garment');
        $this->addSql('DROP TABLE outfit_suggestion');
        $this->addSql('DROP TABLE outfit_suggestion_garment');
        $this->addSql('DROP TABLE style_preference');
        $this->addSql('DROP TABLE wear_log');
    }
}
