<?php

namespace App\Service\Identity;

use App\Entity\Identity\Profile;
use App\Entity\Loan\Loan;
use App\Enum\Loan\LoanStatus;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

/**
 * Supprime un profil enfant, selon la procédure du MDD (« Supprimer un
 * profil enfant ») et le principe du profil fantôme (29/09).
 *
 *  - Ce qui appartient au foyer passe au TUTEUR : objets, vêtements,
 *    médias, logements, collections, tenues, catégories personnelles.
 *  - Ce qui implique des tiers survit, réaffecté au PROFIL FANTÔME :
 *    prêts terminés et leur journal, commandes et leur journal,
 *    remboursements, litiges, commentaires, publications, annonces,
 *    historique des déplacements.
 *  - Ce qui n'a de sens que pour le profil part avec lui (CASCADE en
 *    base) : relations, préférences, suggestions, notifications…
 *  - Un prêt ACTIF ou une commande en cours BLOQUE la suppression.
 *
 * Tout se fait dans une transaction, en SQL de masse : un profil peut
 * avoir des centaines d'objets. Les clés étrangères en RESTRICT servent
 * de filet : une référence oubliée ici fait échouer la suppression au
 * lieu de passer en silence.
 *
 * Supprimer un profil ADULTE n'est pas encore défini : à qui iraient ses
 * biens ? Décision produit en attente, le service le refuse.
 */
final class ProfileDeleter
{
    private const GHOST = Profile::GHOST_ID;

    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public function deleteChild(Profile $child, Profile $actor): void
    {
        if ($child->isGhost()) {
            throw new \LogicException('Le profil fantôme ne se supprime pas.');
        }
        if (!$child->isChild() || null === $child->getGuardian()) {
            throw new \LogicException('Seule la suppression d\'un profil enfant est définie pour l\'instant.');
        }
        $guardian = $child->getGuardian();
        if (!$actor->getId()->equals($guardian->getId())) {
            throw new AccessDeniedException('Seul le tuteur supprime un profil enfant.');
        }

        $this->em->wrapInTransaction(function () use ($child, $guardian): void {
            $conn = $this->em->getConnection();
            $c = $child->getId()->toRfc4122();
            $g = $guardian->getId()->toRfc4122();

            $this->assertNothingInProgress($conn, $c);
            $this->cancelPendingLoans($child);
            $this->em->flush();

            // Ses règles de masquage partiraient en CASCADE ; supprimées d'abord, elles
            // ne peuvent pas entrer en conflit d'unicité pendant la fusion des catégories.
            $conn->executeStatement('DELETE FROM garment_visibility_preference WHERE profile_id = :c', ['c' => $c]);

            // --- Au tuteur : les biens du foyer ------------------------------------
            // Une seule résidence principale par profil : celle de l'enfant perd ce statut.
            $conn->executeStatement('UPDATE place SET owner_id = :g, is_primary = false WHERE owner_id = :c', ['g' => $g, 'c' => $c]);
            // Ses pièces (il les a créées) et sa place dans les logements : au tuteur.
            $conn->executeStatement('UPDATE room SET created_by_id = :g WHERE created_by_id = :c', ['g' => $g, 'c' => $c]);
            $conn->executeStatement(
                'INSERT INTO place_member (id, place_id, profile_id, created_at, updated_at)
                 SELECT gen_random_uuid(), m.place_id, :g, now(), now() FROM place_member m
                 WHERE m.profile_id = :c AND NOT EXISTS (SELECT 1 FROM place_member o WHERE o.place_id = m.place_id AND o.profile_id = :g)',
                ['g' => $g, 'c' => $c],
            );
            foreach (['item', 'garment', 'media', 'collection', 'outfit'] as $table) {
                $conn->executeStatement("UPDATE $table SET owner_id = :g WHERE owner_id = :c", ['g' => $g, 'c' => $c]);
            }
            $this->transferCategories($conn, 'item_category', 'item', $c, $g);
            $this->transferCategories($conn, 'garment_category', 'garment', $c, $g);

            // Les partages de l'enfant sont révoqués (MDD), et suivent leurs cibles chez le tuteur ;
            // ceux qu'il avait repartagés chez d'autres sont révoqués et passent au fantôme.
            $conn->executeStatement('UPDATE share SET revoked_at = COALESCE(revoked_at, now()), owner_id = :g, shared_by_id = CASE WHEN shared_by_id = :c THEN :g ELSE shared_by_id END WHERE owner_id = :c', ['g' => $g, 'c' => $c]);
            $conn->executeStatement('UPDATE share SET revoked_at = COALESCE(revoked_at, now()), shared_by_id = :ghost WHERE shared_by_id = :c', ['ghost' => self::GHOST, 'c' => $c]);

            // --- Au fantôme : ce qui implique des tiers -------------------------------
            // Publications : retirées, mais les commentaires des autres gardent leur fil.
            $conn->executeStatement('UPDATE post SET deleted_at = COALESCE(deleted_at, now()), author_id = :ghost WHERE author_id = :c', ['ghost' => self::GHOST, 'c' => $c]);
            // Annonces encore ouvertes (sans commande en cours) : retirées.
            $conn->executeStatement("UPDATE listing SET status = 'WITHDRAWN', closed_at = now() WHERE seller_id = :c AND status IN ('DRAFT', 'PUBLISHED')", ['c' => $c]);
            foreach ([
                ['listing', 'seller_id'],
                ['loan', 'lender_id'],
                ['loan', 'borrower_id'],
                ['loan_event', 'actor_id'],
                ['"order"', 'buyer_id'],
                ['"order"', 'seller_id'],
                ['order_event', 'actor_id'],
                ['refund', 'requested_by_id'],
                ['dispute', 'opener_id'],
                ['comment', 'author_id'],
                ['location_history', 'moved_by_id'],
                ['profile_permission', 'updated_by_id'],
                ['approval_request', 'approver_id'],
            ] as [$table, $column]) {
                $conn->executeStatement("UPDATE $table SET $column = :ghost WHERE $column = :c", ['ghost' => self::GHOST, 'c' => $c]);
            }

            // --- Enfin, la ligne elle-même : le reste part en CASCADE -------------------
            $conn->executeStatement('DELETE FROM profile WHERE id = :c', ['c' => $c]);
        });

        $this->em->clear();
    }

    /** Un prêt actif ou une commande en cours implique un tiers : on attend qu'ils soient clos. */
    private function assertNothingInProgress(Connection $conn, string $c): void
    {
        $activeLoans = (int) $conn->fetchOne("SELECT count(*) FROM loan WHERE status = 'ACTIVE' AND (lender_id = :c OR borrower_id = :c)", ['c' => $c]);
        if ($activeLoans > 0) {
            throw new ProfileDeletionBlocked(\sprintf('%d prêt(s) en cours : l\'objet est chez quelqu\'un, ou quelqu\'un attend son retour. Clos-le avant de supprimer le profil.', $activeLoans));
        }
        $openOrders = (int) $conn->fetchOne("SELECT count(*) FROM \"order\" WHERE status NOT IN ('COMPLETED', 'CANCELLED', 'REFUNDED') AND (buyer_id = :c OR seller_id = :c)", ['c' => $c]);
        if ($openOrders > 0) {
            throw new ProfileDeletionBlocked(\sprintf('%d commande(s) en cours : termine-les ou annule-les avant de supprimer le profil.', $openOrders));
        }
    }

    /** Les prêts demandés ou acceptés, pas encore remis, sont annulés — avec leur événement de journal. */
    private function cancelPendingLoans(Profile $child): void
    {
        $pending = $this->em->createQueryBuilder()
            ->select('l')->from(Loan::class, 'l')
            ->where('(l.lender = :c OR l.borrower = :c)')
            ->andWhere('l.status IN (:open)')
            ->setParameter('c', $child->getId(), 'uuid')
            ->setParameter('open', [LoanStatus::Requested->value, LoanStatus::Accepted->value])
            ->getQuery()->getResult();

        foreach ($pending as $loan) {
            $loan->cancel($child);
        }
    }

    /**
     * Transfère les catégories personnelles de l'enfant au tuteur. Un slug
     * est unique par propriétaire : si le tuteur a déjà une catégorie de
     * même slug, on fusionne (les objets et les sous-catégories passent sur
     * la sienne) au lieu de violer l'unicité.
     */
    private function transferCategories(Connection $conn, string $table, string $possessionTable, string $c, string $g): void
    {
        $duplicates = $conn->fetchAllAssociative(
            "SELECT mine.id AS child_id, theirs.id AS guardian_id FROM $table mine JOIN $table theirs ON theirs.slug = mine.slug AND theirs.owner_id = :g WHERE mine.owner_id = :c",
            ['c' => $c, 'g' => $g],
        );
        foreach ($duplicates as $d) {
            $params = ['from' => $d['child_id'], 'to' => $d['guardian_id']];
            $conn->executeStatement("UPDATE $possessionTable SET category_id = :to WHERE category_id = :from", $params);
            $conn->executeStatement("UPDATE $table SET parent_id = :to WHERE parent_id = :from", $params);
            if ('garment_category' === $table) {
                $conn->executeStatement('UPDATE garment_visibility_preference SET garment_category_id = :to WHERE garment_category_id = :from', $params);
            }
            $conn->executeStatement("DELETE FROM $table WHERE id = :from", ['from' => $d['child_id']]);
        }
        $conn->executeStatement("UPDATE $table SET owner_id = :g WHERE owner_id = :c", ['g' => $g, 'c' => $c]);
    }
}
