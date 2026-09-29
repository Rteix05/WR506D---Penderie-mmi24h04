<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Domaine « Vente, paiement & livraison » du MDD V2 : Listing,
 * ListingMedia, ListingComment (5e sous-type de Comment), Order,
 * OrderEvent, OrderAddress, Address, Payment, Refund, Dispute, Shipment.
 *
 * SQL des tables généré par doctrine:migrations:diff (la table s'appelle
 * "order", mot réservé, d'où les guillemets), complété à la main :
 *  - les CHECK, dont celui du MDD « espèces ⇒ main propre », et les statuts
 *    permis par parcours (une commande en espèces ne passe jamais par
 *    PAID, SHIPPED, DELIVERED ni REFUNDED) ;
 *  - la hiérarchie Comment accepte LISTING ;
 *  - l'écriture seule de order_event (sauf actor_id, profil fantôme) et
 *    de order_address (« aucune mise à jour après création »), par le
 *    déclencheur de garde créé avec le prêt.
 */
final class Version20260929194741 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Vente : listing, listing_media, order, order_event, order_address, address, payment, refund, dispute, shipment ; ListingComment';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE address (id UUID NOT NULL, label VARCHAR(50) NOT NULL, line1 VARCHAR(255) NOT NULL, line2 VARCHAR(255) DEFAULT NULL, postal_code VARCHAR(20) NOT NULL, city VARCHAR(100) NOT NULL, country VARCHAR(2) NOT NULL, is_default BOOLEAN NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, profile_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_address_profile ON address (profile_id)');
        $this->addSql('CREATE UNIQUE INDEX uniq_address_default_per_profile ON address (profile_id) WHERE (is_default = true)');
        $this->addSql('CREATE TABLE dispute (id UUID NOT NULL, reason VARCHAR(30) NOT NULL, description TEXT NOT NULL, status VARCHAR(20) NOT NULL, resolution TEXT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, order_id UUID NOT NULL, opener_id UUID NOT NULL, handled_by_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_3C9250078D9F6D38 ON dispute (order_id)');
        $this->addSql('CREATE INDEX idx_dispute_status ON dispute (status)');
        $this->addSql('CREATE INDEX IDX_3C9250072B174A2B ON dispute (opener_id)');
        $this->addSql('CREATE INDEX IDX_3C925007FE65AF40 ON dispute (handled_by_id)');
        $this->addSql('CREATE TABLE listing (id UUID NOT NULL, price NUMERIC(10, 2) NOT NULL, currency VARCHAR(3) NOT NULL, description TEXT DEFAULT NULL, status VARCHAR(20) NOT NULL, audience VARCHAR(30) NOT NULL, published_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, closed_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, seller_id UUID NOT NULL, item_id UUID DEFAULT NULL, garment_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_listing_status_published ON listing (status, published_at)');
        $this->addSql('CREATE INDEX idx_listing_item_status ON listing (item_id, status)');
        $this->addSql('CREATE INDEX idx_listing_garment_status ON listing (garment_id, status)');
        $this->addSql('CREATE INDEX idx_listing_seller ON listing (seller_id)');
        $this->addSql('CREATE UNIQUE INDEX uniq_listing_on_sale_item ON listing (item_id) WHERE ((status)::text = ANY (ARRAY[(\'PUBLISHED\'::character varying)::text, (\'RESERVED\'::character varying)::text]))');
        $this->addSql('CREATE UNIQUE INDEX uniq_listing_on_sale_garment ON listing (garment_id) WHERE ((status)::text = ANY (ARRAY[(\'PUBLISHED\'::character varying)::text, (\'RESERVED\'::character varying)::text]))');
        $this->addSql('CREATE INDEX IDX_CB0048D4126F525E ON listing (item_id)');
        $this->addSql('CREATE INDEX IDX_CB0048D49CDB257C ON listing (garment_id)');
        $this->addSql('CREATE TABLE listing_media (position INT NOT NULL, listing_id UUID NOT NULL, media_id UUID NOT NULL, PRIMARY KEY (listing_id, media_id))');
        $this->addSql('CREATE INDEX idx_listing_media_order ON listing_media (listing_id, position)');
        $this->addSql('CREATE INDEX IDX_9CC27980D4619D1A ON listing_media (listing_id)');
        $this->addSql('CREATE INDEX IDX_9CC27980EA9FDD75 ON listing_media (media_id)');
        $this->addSql('CREATE TABLE "order" (id UUID NOT NULL, reference VARCHAR(20) NOT NULL, item_amount NUMERIC(10, 2) NOT NULL, total_amount NUMERIC(10, 2) NOT NULL, currency VARCHAR(3) NOT NULL, payment_method VARCHAR(20) NOT NULL, delivery_method VARCHAR(20) NOT NULL, status VARCHAR(30) NOT NULL, handover_confirmed_by_seller_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, handover_confirmed_by_buyer_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, listing_id UUID NOT NULL, buyer_id UUID NOT NULL, seller_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_F5299398AEA34913 ON "order" (reference)');
        $this->addSql('CREATE INDEX idx_order_buyer_status ON "order" (buyer_id, status)');
        $this->addSql('CREATE INDEX idx_order_seller_status ON "order" (seller_id, status)');
        $this->addSql('CREATE UNIQUE INDEX uniq_order_open_listing ON "order" (listing_id) WHERE ((status)::text <> \'CANCELLED\'::text)');
        $this->addSql('CREATE INDEX IDX_F5299398D4619D1A ON "order" (listing_id)');
        $this->addSql('CREATE INDEX IDX_F52993986C755722 ON "order" (buyer_id)');
        $this->addSql('CREATE INDEX IDX_F52993988DE820D9 ON "order" (seller_id)');
        $this->addSql('CREATE TABLE order_address (id UUID NOT NULL, role VARCHAR(20) NOT NULL, full_name VARCHAR(120) NOT NULL, phone VARCHAR(30) DEFAULT NULL, line1 VARCHAR(255) NOT NULL, line2 VARCHAR(255) DEFAULT NULL, postal_code VARCHAR(20) NOT NULL, city VARCHAR(100) NOT NULL, country VARCHAR(2) NOT NULL, order_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX uniq_order_address_role ON order_address (order_id, role)');
        $this->addSql('CREATE INDEX IDX_FB34C6CA8D9F6D38 ON order_address (order_id)');
        $this->addSql('CREATE TABLE order_event (id UUID NOT NULL, type VARCHAR(40) NOT NULL, note TEXT DEFAULT NULL, occurred_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, order_id UUID NOT NULL, actor_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_order_event_order_occurred ON order_event (order_id, occurred_at)');
        $this->addSql('CREATE INDEX IDX_B8307E5A8D9F6D38 ON order_event (order_id)');
        $this->addSql('CREATE INDEX IDX_B8307E5A10DAF24A ON order_event (actor_id)');
        $this->addSql('CREATE TABLE payment (id UUID NOT NULL, direction VARCHAR(10) NOT NULL, provider VARCHAR(30) NOT NULL, external_id VARCHAR(255) NOT NULL, amount NUMERIC(10, 2) NOT NULL, currency VARCHAR(3) NOT NULL, status VARCHAR(20) NOT NULL, raw_payload JSONB DEFAULT NULL, settled_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, order_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_payment_order ON payment (order_id)');
        $this->addSql('CREATE UNIQUE INDEX uniq_payment_provider_external ON payment (provider, external_id)');
        $this->addSql('CREATE TABLE refund (id UUID NOT NULL, amount NUMERIC(10, 2) NOT NULL, reason TEXT NOT NULL, provider VARCHAR(30) NOT NULL, external_id VARCHAR(255) DEFAULT NULL, status VARCHAR(20) NOT NULL, processed_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, order_id UUID NOT NULL, payment_id UUID NOT NULL, requested_by_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_refund_order ON refund (order_id)');
        $this->addSql('CREATE INDEX IDX_5B2C14584C3A3BB ON refund (payment_id)');
        $this->addSql('CREATE INDEX IDX_5B2C14584DA1E751 ON refund (requested_by_id)');
        $this->addSql('CREATE TABLE shipment (id UUID NOT NULL, carrier VARCHAR(50) NOT NULL, tracking_number VARCHAR(100) DEFAULT NULL, status VARCHAR(20) NOT NULL, shipped_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, delivered_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, order_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_2CB20DC8D9F6D38 ON shipment (order_id)');
        $this->addSql('ALTER TABLE address ADD CONSTRAINT FK_D4E6F81CCFA12B8 FOREIGN KEY (profile_id) REFERENCES profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE dispute ADD CONSTRAINT FK_3C9250078D9F6D38 FOREIGN KEY (order_id) REFERENCES "order" (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE dispute ADD CONSTRAINT FK_3C9250072B174A2B FOREIGN KEY (opener_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE dispute ADD CONSTRAINT FK_3C925007FE65AF40 FOREIGN KEY (handled_by_id) REFERENCES account (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE listing ADD CONSTRAINT FK_CB0048D48DE820D9 FOREIGN KEY (seller_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE listing ADD CONSTRAINT FK_CB0048D4126F525E FOREIGN KEY (item_id) REFERENCES item (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE listing ADD CONSTRAINT FK_CB0048D49CDB257C FOREIGN KEY (garment_id) REFERENCES garment (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE listing_media ADD CONSTRAINT FK_9CC27980D4619D1A FOREIGN KEY (listing_id) REFERENCES listing (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE listing_media ADD CONSTRAINT FK_9CC27980EA9FDD75 FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE "order" ADD CONSTRAINT FK_F5299398D4619D1A FOREIGN KEY (listing_id) REFERENCES listing (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE "order" ADD CONSTRAINT FK_F52993986C755722 FOREIGN KEY (buyer_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE "order" ADD CONSTRAINT FK_F52993988DE820D9 FOREIGN KEY (seller_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE order_address ADD CONSTRAINT FK_FB34C6CA8D9F6D38 FOREIGN KEY (order_id) REFERENCES "order" (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE order_event ADD CONSTRAINT FK_B8307E5A8D9F6D38 FOREIGN KEY (order_id) REFERENCES "order" (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE order_event ADD CONSTRAINT FK_B8307E5A10DAF24A FOREIGN KEY (actor_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE payment ADD CONSTRAINT FK_6D28840D8D9F6D38 FOREIGN KEY (order_id) REFERENCES "order" (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE refund ADD CONSTRAINT FK_5B2C14588D9F6D38 FOREIGN KEY (order_id) REFERENCES "order" (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE refund ADD CONSTRAINT FK_5B2C14584C3A3BB FOREIGN KEY (payment_id) REFERENCES payment (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE refund ADD CONSTRAINT FK_5B2C14584DA1E751 FOREIGN KEY (requested_by_id) REFERENCES profile (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE shipment ADD CONSTRAINT FK_2CB20DC8D9F6D38 FOREIGN KEY (order_id) REFERENCES "order" (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('ALTER TABLE comment ADD listing_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE comment ADD CONSTRAINT FK_9474526CD4619D1A FOREIGN KEY (listing_id) REFERENCES listing (id) ON DELETE RESTRICT NOT DEFERRABLE');
        $this->addSql('CREATE INDEX IDX_9474526CD4619D1A ON comment (listing_id)');

        // --- Listing ------------------------------------------------------------------
        $this->addSql("ALTER TABLE listing ADD CONSTRAINT chk_listing_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'RESERVED', 'SOLD', 'WITHDRAWN', 'EXPIRED'))");
        $this->addSql("ALTER TABLE listing ADD CONSTRAINT chk_listing_audience CHECK (audience IN ('FRIENDS_ONLY', 'FRIENDS_AND_FOLLOWERS'))");
        $this->addSql('ALTER TABLE listing ADD CONSTRAINT chk_listing_target CHECK ((item_id IS NULL) <> (garment_id IS NULL))');
        $this->addSql('ALTER TABLE listing ADD CONSTRAINT chk_listing_price CHECK (price >= 0)');
        $this->addSql("ALTER TABLE listing ADD CONSTRAINT chk_listing_currency CHECK (currency ~ '^[A-Z]{3}$')");
        // Les dates suivent le statut.
        $this->addSql("ALTER TABLE listing ADD CONSTRAINT chk_listing_published_at CHECK (status IN ('DRAFT', 'WITHDRAWN') OR published_at IS NOT NULL)");
        $this->addSql("ALTER TABLE listing ADD CONSTRAINT chk_listing_closed_at CHECK ((status IN ('SOLD', 'WITHDRAWN', 'EXPIRED')) = (closed_at IS NOT NULL))");
        $this->addSql('ALTER TABLE listing_media ADD CONSTRAINT chk_listing_media_position CHECK (position >= 0)');

        // --- Comment : cinquième sous-type, LISTING -------------------------------------
        $this->addSql('ALTER TABLE comment DROP CONSTRAINT chk_comment_target_type');
        $this->addSql("ALTER TABLE comment ADD CONSTRAINT chk_comment_target_type CHECK (target_type IN ('ITEM', 'GARMENT', 'COLLECTION', 'POST', 'LISTING'))");
        $this->addSql("ALTER TABLE comment ADD CONSTRAINT chk_comment_target_listing_id CHECK ((target_type = 'LISTING') = (listing_id IS NOT NULL))");

        // --- Order --------------------------------------------------------------------
        $this->addSql("ALTER TABLE \"order\" ADD CONSTRAINT chk_order_payment_method CHECK (payment_method IN ('ONLINE', 'CASH'))");
        $this->addSql("ALTER TABLE \"order\" ADD CONSTRAINT chk_order_delivery_method CHECK (delivery_method IN ('SHIPPING', 'HANDOVER'))");
        $this->addSql("ALTER TABLE \"order\" ADD CONSTRAINT chk_order_status CHECK (status IN ('PENDING_PAYMENT', 'AWAITING_HANDOVER', 'PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'))");
        // MDD : on ne paie pas un colis en espèces.
        $this->addSql("ALTER TABLE \"order\" ADD CONSTRAINT chk_order_cash_handover CHECK (payment_method <> 'CASH' OR delivery_method = 'HANDOVER')");
        // Statuts permis par parcours : l'espèce ne passe jamais par le prestataire…
        $this->addSql("ALTER TABLE \"order\" ADD CONSTRAINT chk_order_cash_statuses CHECK (payment_method = 'ONLINE' OR status IN ('AWAITING_HANDOVER', 'COMPLETED', 'CANCELLED'))");
        // … le paiement en ligne n'attend jamais une remise d'espèces…
        $this->addSql("ALTER TABLE \"order\" ADD CONSTRAINT chk_order_online_statuses CHECK (payment_method = 'CASH' OR status <> 'AWAITING_HANDOVER')");
        // … et seule une expédition passe par SHIPPED et DELIVERED.
        $this->addSql("ALTER TABLE \"order\" ADD CONSTRAINT chk_order_shipping_statuses CHECK (delivery_method = 'SHIPPING' OR status NOT IN ('SHIPPED', 'DELIVERED'))");
        $this->addSql('ALTER TABLE "order" ADD CONSTRAINT chk_order_not_self CHECK (buyer_id <> seller_id)');
        // Aucun frais de plateforme : le total ne dépasse le prix que d'une livraison.
        $this->addSql('ALTER TABLE "order" ADD CONSTRAINT chk_order_amounts CHECK (item_amount >= 0 AND total_amount >= item_amount)');
        $this->addSql("ALTER TABLE \"order\" ADD CONSTRAINT chk_order_currency CHECK (currency ~ '^[A-Z]{3}$')");
        $this->addSql("ALTER TABLE order_event ADD CONSTRAINT chk_order_event_type CHECK (type IN ('CREATED', 'PAYMENT_AUTHORIZED', 'PAYMENT_CAPTURED', 'PAYMENT_FAILED', 'HANDOVER_SCHEDULED', 'HANDOVER_CONFIRMED_BY_SELLER', 'HANDOVER_CONFIRMED_BY_BUYER', 'SHIPPED', 'DELIVERED', 'RECEIVED', 'COMPLETED', 'CANCELLED', 'REFUND_REQUESTED', 'REFUND_ISSUED', 'DISPUTE_OPENED'))");

        // --- Adresses -------------------------------------------------------------------
        $this->addSql("ALTER TABLE order_address ADD CONSTRAINT chk_order_address_role CHECK (role IN ('SHIPPING', 'BILLING'))");
        $this->addSql("ALTER TABLE order_address ADD CONSTRAINT chk_order_address_country CHECK (country ~ '^[A-Z]{2}$')");
        $this->addSql("ALTER TABLE address ADD CONSTRAINT chk_address_country CHECK (country ~ '^[A-Z]{2}$')");

        // --- Argent, litige, expédition -------------------------------------------------
        $this->addSql("ALTER TABLE payment ADD CONSTRAINT chk_payment_direction CHECK (direction IN ('CHARGE', 'PAYOUT'))");
        $this->addSql("ALTER TABLE payment ADD CONSTRAINT chk_payment_status CHECK (status IN ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED'))");
        $this->addSql('ALTER TABLE payment ADD CONSTRAINT chk_payment_amount CHECK (amount > 0)');
        $this->addSql("ALTER TABLE payment ADD CONSTRAINT chk_payment_currency CHECK (currency ~ '^[A-Z]{3}$')");
        $this->addSql("ALTER TABLE refund ADD CONSTRAINT chk_refund_status CHECK (status IN ('REQUESTED', 'PROCESSING', 'SUCCEEDED', 'FAILED'))");
        $this->addSql('ALTER TABLE refund ADD CONSTRAINT chk_refund_amount CHECK (amount > 0)');
        $this->addSql("ALTER TABLE dispute ADD CONSTRAINT chk_dispute_reason CHECK (reason IN ('NOT_RECEIVED', 'NOT_AS_DESCRIBED', 'DAMAGED', 'PAYMENT_ISSUE', 'OTHER'))");
        $this->addSql("ALTER TABLE dispute ADD CONSTRAINT chk_dispute_status CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'))");
        $this->addSql("ALTER TABLE shipment ADD CONSTRAINT chk_shipment_status CHECK (status IN ('SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED', 'LOST'))");

        // --- Écriture seule (déclencheur créé par la migration du prêt) -----------------
        // Correctif de penderie_append_only() (créée avec le prêt), trouvé par le test :
        // appelée SANS argument, TG_ARGV vaut NULL et non un tableau vide ; « jsonb - NULL »
        // donnait NULL des deux côtés, et NULL IS DISTINCT FROM NULL est faux : toute
        // modification passait. COALESCE ramène le cas sans argument à « aucune colonne
        // modifiable ». Les déclencheurs du prêt, qui passent 'actor_id', n'étaient pas touchés.
        $this->addSql(<<<'SQL'
            CREATE OR REPLACE FUNCTION penderie_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
            DECLARE
                editable text[] := COALESCE(TG_ARGV, ARRAY[]::text[]);
            BEGIN
                IF TG_OP = 'DELETE' THEN
                    RAISE EXCEPTION 'La table % est en écriture seule : suppression interdite.', TG_TABLE_NAME
                        USING ERRCODE = 'insufficient_privilege';
                END IF;
                IF (to_jsonb(NEW) - editable) IS DISTINCT FROM (to_jsonb(OLD) - editable) THEN
                    RAISE EXCEPTION 'La table % est en écriture seule : modification interdite.', TG_TABLE_NAME
                        USING ERRCODE = 'insufficient_privilege';
                END IF;
                RETURN NEW;
            END
            $$
            SQL);
        $this->addSql("CREATE TRIGGER trg_order_event_append_only BEFORE UPDATE OR DELETE ON order_event FOR EACH ROW EXECUTE FUNCTION penderie_append_only('actor_id')");
        $this->addSql('CREATE TRIGGER trg_order_address_append_only BEFORE UPDATE OR DELETE ON order_address FOR EACH ROW EXECUTE FUNCTION penderie_append_only()');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TRIGGER IF EXISTS trg_order_event_append_only ON order_event');
        $this->addSql('DROP TRIGGER IF EXISTS trg_order_address_append_only ON order_address');
        // Les commentaires d'annonce disparaissent avec la colonne listing_id.
        $this->addSql("DELETE FROM comment WHERE target_type = 'LISTING'");
        $this->addSql('ALTER TABLE comment DROP CONSTRAINT chk_comment_target_listing_id');
        $this->addSql('ALTER TABLE comment DROP CONSTRAINT chk_comment_target_type');
        $this->addSql("ALTER TABLE comment ADD CONSTRAINT chk_comment_target_type CHECK (target_type IN ('ITEM', 'GARMENT', 'COLLECTION', 'POST'))");
        // La colonne listing_id de comment référence listing : elle part AVANT la table.
        $this->addSql('ALTER TABLE comment DROP CONSTRAINT FK_9474526CD4619D1A');
        $this->addSql('DROP INDEX IDX_9474526CD4619D1A');
        $this->addSql('ALTER TABLE comment DROP listing_id');
        $this->addSql('ALTER TABLE address DROP CONSTRAINT FK_D4E6F81CCFA12B8');
        $this->addSql('ALTER TABLE dispute DROP CONSTRAINT FK_3C9250078D9F6D38');
        $this->addSql('ALTER TABLE dispute DROP CONSTRAINT FK_3C9250072B174A2B');
        $this->addSql('ALTER TABLE dispute DROP CONSTRAINT FK_3C925007FE65AF40');
        $this->addSql('ALTER TABLE listing DROP CONSTRAINT FK_CB0048D48DE820D9');
        $this->addSql('ALTER TABLE listing DROP CONSTRAINT FK_CB0048D4126F525E');
        $this->addSql('ALTER TABLE listing DROP CONSTRAINT FK_CB0048D49CDB257C');
        $this->addSql('ALTER TABLE listing_media DROP CONSTRAINT FK_9CC27980D4619D1A');
        $this->addSql('ALTER TABLE listing_media DROP CONSTRAINT FK_9CC27980EA9FDD75');
        $this->addSql('ALTER TABLE "order" DROP CONSTRAINT FK_F5299398D4619D1A');
        $this->addSql('ALTER TABLE "order" DROP CONSTRAINT FK_F52993986C755722');
        $this->addSql('ALTER TABLE "order" DROP CONSTRAINT FK_F52993988DE820D9');
        $this->addSql('ALTER TABLE order_address DROP CONSTRAINT FK_FB34C6CA8D9F6D38');
        $this->addSql('ALTER TABLE order_event DROP CONSTRAINT FK_B8307E5A8D9F6D38');
        $this->addSql('ALTER TABLE order_event DROP CONSTRAINT FK_B8307E5A10DAF24A');
        $this->addSql('ALTER TABLE payment DROP CONSTRAINT FK_6D28840D8D9F6D38');
        $this->addSql('ALTER TABLE refund DROP CONSTRAINT FK_5B2C14588D9F6D38');
        $this->addSql('ALTER TABLE refund DROP CONSTRAINT FK_5B2C14584C3A3BB');
        $this->addSql('ALTER TABLE refund DROP CONSTRAINT FK_5B2C14584DA1E751');
        $this->addSql('ALTER TABLE shipment DROP CONSTRAINT FK_2CB20DC8D9F6D38');
        $this->addSql('DROP TABLE address');
        $this->addSql('DROP TABLE dispute');
        $this->addSql('DROP TABLE listing');
        $this->addSql('DROP TABLE listing_media');
        $this->addSql('DROP TABLE "order"');
        $this->addSql('DROP TABLE order_address');
        $this->addSql('DROP TABLE order_event');
        $this->addSql('DROP TABLE payment');
        $this->addSql('DROP TABLE refund');
        $this->addSql('DROP TABLE shipment');
    }
}
