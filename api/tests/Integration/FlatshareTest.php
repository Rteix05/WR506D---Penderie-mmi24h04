<?php

namespace App\Tests\Integration;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Item;
use App\Entity\Place\Place;
use App\Entity\Place\PlaceDecision;
use App\Entity\Place\Room;
use App\Entity\Place\Storage;
use App\Entity\Relation\Friendship;
use App\Entity\Sharing\Contribution;
use App\Entity\Sharing\RoomShare;
use App\Entity\Sharing\StorageShare;
use App\Enum\Identity\ProfileType;
use App\Enum\Place\PlaceDecisionStatus;
use App\Enum\Sharing\ContributionBasis;
use App\Enum\Sharing\ShareAudience as Au;
use App\Repository\Relation\FriendshipRepository;
use App\Security\ResourceAccess;
use App\Service\Place\ContainsPossessions;
use App\Service\Place\PlaceDecisions;
use App\Service\Place\PlaceLeaver;
use App\Service\Sharing\ContributionReviewer;

/**
 * Colocation, partage d'un rangement et propositions du foyer (décisions
 * du 30/09) : les règles qui ne tiennent pas dans une case du tableau.
 */
final class FlatshareTest extends DatabaseTestCase
{
    private ResourceAccess $access;
    private PlaceDecisions $decisions;
    private PlaceLeaver $leaver;
    private Profile $camille;
    private Profile $marc;
    private Profile $julie;
    private Place $appart;
    private Room $salon;

    protected function setUp(): void
    {
        parent::setUp();
        $friendships = new FriendshipRepository(self::getContainer()->get('doctrine'));
        $this->access = new ResourceAccess($this->em, $friendships);
        $this->decisions = new PlaceDecisions($this->em, $friendships);
        $this->leaver = new PlaceLeaver($this->em, $this->decisions);
        $this->camille = $this->profile('camille');
        $this->marc = $this->profile('marc');
        $this->julie = $this->profile('julie');
        $this->persist(
            (new Friendship($this->camille, $this->marc))->accept(),
            (new Friendship($this->camille, $this->julie))->accept(),
        );
        $this->appart = new Place($this->camille, 'Appart');
        $this->salon = new Room($this->appart, 'Salon');
        $this->persist($this->appart, $this->salon);
    }

    private function flatshareWithMarc(): void
    {
        $this->decisions->vote($this->decisions->invite($this->appart, $this->camille, $this->marc), $this->marc, true);
        self::assertTrue($this->appart->hasMember($this->marc));
    }

    public function testInvitingNeedsEveryoneIncludingTheInvitee(): void
    {
        $invitation = $this->decisions->invite($this->appart, $this->camille, $this->marc);
        self::assertFalse($this->appart->hasMember($this->marc), 'rien tant que l\'invité n\'a pas accepté');
        $this->decisions->vote($invitation, $this->marc, true);
        self::assertSame(PlaceDecisionStatus::Approved, $invitation->getStatus());
        self::assertTrue($this->appart->hasMember($this->marc));

        // Julie : Camille l'invite, Marc doit accepter aussi — un seul non suffit.
        $second = $this->decisions->invite($this->appart, $this->camille, $this->julie);
        $this->decisions->vote($second, $this->julie, true);
        self::assertFalse($this->appart->hasMember($this->julie), 'Marc n\'a pas encore voté');
        $this->decisions->vote($second, $this->marc, false);
        self::assertSame(PlaceDecisionStatus::Rejected, $second->getStatus());
        self::assertFalse($this->appart->hasMember($this->julie));
    }

    public function testDecisionRules(): void
    {
        $paul = $this->profile('paul');
        $this->flatshareWithMarc();
        $decision = $this->decisions->deletePlace($this->appart, $this->camille);

        foreach ([
            'on n\'invite qu\'un ami' => fn () => $this->decisions->invite($this->appart, $this->camille, $paul),
            'un enfant ne s\'invite pas en coloc' => fn () => PlaceDecision::inviteMember($this->appart, $this->camille, $this->child('lina', $this->camille)),
            'un non-membre ne vote pas' => fn () => $decision->vote($paul, true),
            'on ne vote pas deux fois' => fn () => $decision->vote($this->camille, true),
            'seul l\'auteur retire sa décision' => fn () => $decision->cancel($this->marc),
            'pas deux fois la même décision en attente' => fn () => $this->decisions->deletePlace($this->appart, $this->marc),
        ] as $rule => $attempt) {
            try {
                $attempt();
                self::fail("Règle non appliquée : $rule");
            } catch (\LogicException) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function testDeletingTheFlatNeedsEveryoneAndAnEmptyFlat(): void
    {
        $this->flatshareWithMarc();
        $lampe = new Item($this->marc, 'Lampe de Marc', $this->salon);
        $this->persist($lampe);

        try {
            $this->decisions->deletePlace($this->appart, $this->camille);
            self::fail('Un logement qui contient des affaires ne se supprime pas.');
        } catch (ContainsPossessions) {
            $this->addToAssertionCount(1);
        }

        $this->em->remove($lampe);
        $this->em->flush();
        $placeId = $this->appart->getId();
        $decision = $this->decisions->deletePlace($this->appart, $this->camille);
        self::assertNotNull($this->em->find(Place::class, $placeId), 'Marc n\'a pas encore voté');
        $this->decisions->vote($decision, $this->marc, true);
        $this->em->clear();
        self::assertNull($this->em->find(Place::class, $placeId));
    }

    public function testClosedRoomAndReopening(): void
    {
        $this->flatshareWithMarc();
        $chambre = (new Room($this->appart, 'Chambre de Camille', createdBy: $this->camille))->close($this->camille);
        $this->persist($chambre);

        self::assertFalse($this->access->canRead($this->marc, $chambre));
        foreach ([
            'seul le créateur ferme' => fn () => $this->salon->close($this->marc),
            'seul le créateur rouvre (tant qu\'il est là)' => fn () => $chambre->open($this->marc),
            'seul le créateur autorise' => fn () => $chambre->allow($this->marc, $this->marc),
        ] as $rule => $attempt) {
            try {
                $attempt();
                self::fail("Règle non appliquée : $rule");
            } catch (\LogicException) {
                $this->addToAssertionCount(1);
            }
        }

        $chambre->allow($this->camille, $this->marc);
        self::assertTrue($this->access->canManage($this->marc, $chambre), 'autorisé : Marc y a les droits d\'une pièce commune');
        $chambre->disallow($this->camille, $this->marc);
        self::assertFalse($this->access->canRead($this->marc, $chambre));

        // Camille part (avec ses affaires) : sa pièce fermée le reste, mais Marc peut maintenant la rouvrir.
        $this->leaver->leave($this->appart, $this->camille, PlaceLeaver::TAKE);
        self::assertFalse($this->access->canRead($this->marc, $chambre));
        $chambre->open($this->marc);
        self::assertTrue($this->access->canManage($this->marc, $chambre));
        self::assertSame($this->marc, $this->appart->getOwner(), 'le référent qui part passe la main');
    }

    public function testLeavingTakesOrTransfersBelongings(): void
    {
        $this->flatshareWithMarc();
        $chezMoi = $this->room($this->camille, 'Chez moi');
        $lampe = new Item($this->camille, 'Lampe', $this->salon);
        $journal = (new Item($this->camille, 'Journal', $this->salon))->setPersonal(true);
        $this->persist($lampe, $journal, $share = new RoomShare($this->camille, $this->salon, Au::Friends));

        try {
            $this->leaver->leave($this->appart, $this->camille, PlaceLeaver::TRANSFER, heir: $this->marc);
            self::fail('Un objet personnel ne se transmet pas.');
        } catch (\LogicException $e) {
            self::assertStringContainsString('personnel', $e->getMessage());
        }
        try {
            $this->leaver->leave($this->appart, $this->camille, PlaceLeaver::TAKE, $this->salon);
            self::fail('On reprend ses affaires ailleurs que dans le logement qu\'on quitte.');
        } catch (\LogicException) {
            $this->addToAssertionCount(1);
        }

        $this->leaver->leave($this->appart, $this->camille, PlaceLeaver::TAKE, $chezMoi);
        self::assertSame($chezMoi, $lampe->getRoom());
        self::assertSame($chezMoi, $journal->getRoom());
        self::assertFalse($this->appart->hasMember($this->camille));
        self::assertFalse($share->isActive(), 'ses partages du logement sont révoqués');
        try {
            $this->leaver->leave($this->appart, $this->marc, PlaceLeaver::TAKE);
            self::fail('Le dernier occupant supprime le logement, il ne le quitte pas.');
        } catch (\LogicException) {
            $this->addToAssertionCount(1);
        }
    }

    public function testTransferToAFlatmate(): void
    {
        $this->flatshareWithMarc();
        $canape = new Item($this->camille, 'Canapé', $this->salon);
        $this->persist($canape);

        $this->leaver->leave($this->appart, $this->camille, PlaceLeaver::TRANSFER, heir: $this->marc);
        self::assertSame($this->marc, $canape->getOwner());
        self::assertSame($this->salon, $canape->getRoom(), 'le canapé reste dans le salon');
    }

    public function testAPendingDecisionSettlesWhenTheHoldoutLeaves(): void
    {
        $this->flatshareWithMarc();
        $this->decisions->vote($this->decisions->invite($this->appart, $this->camille, $this->julie), $this->julie, true);
        $this->appart->addMember($this->julie); // Julie est déjà là (acceptée plus tôt)
        $this->em->flush();
        $salle = new Room($this->appart, 'Salle de jeux', createdBy: $this->marc);
        $this->persist($salle);

        $decision = $this->decisions->deleteRoom($salle, $this->camille);
        $this->decisions->vote($decision, $this->julie, true);
        self::assertSame(PlaceDecisionStatus::Pending, $decision->getStatus(), 'Marc n\'a pas voté');

        $this->leaver->leave($this->appart, $this->marc, PlaceLeaver::TAKE);
        self::assertSame(PlaceDecisionStatus::Approved, $decision->getStatus(), 'Marc parti, tous ceux qui restent ont dit oui');
    }

    public function testSharingOneStorage(): void
    {
        $sophie = $this->profile('sophie');
        $this->persist((new Friendship($this->camille, $sophie))->accept());
        $etagere = new Storage($this->salon, 'Étagère d\'été');
        $autre = new Storage($this->salon, 'Commode');
        $this->persist($etagere, $autre);
        $sac = new Item($this->camille, 'Sac de plage', $this->salon);
        $sac->placeAt($this->salon, $etagere);
        $pull = new Item($this->camille, 'Pull', $this->salon);
        $pull->placeAt($this->salon, $autre);
        $this->persist($sac, $pull, new StorageShare($this->camille, $etagere, Au::Friends));

        self::assertTrue($this->access->canRead($sophie, $etagere));
        self::assertTrue($this->access->canRead($sophie, $sac), 'ce qui est sur l\'étagère partagée');
        self::assertFalse($this->access->canRead($sophie, $pull), 'pas ce qui est dans la commode');
        self::assertFalse($this->access->canRead($sophie, $this->salon), 'ni la pièce entière');
    }

    public function testHouseholdProposesTheOwnerDecides(): void
    {
        $leo = $this->profile('leo', ProfileType::Adult, null, $this->camille->getAccount());
        $lina = $this->child('lina', $this->camille);
        $jouet = new Item($lina, 'Toupie', $this->room($lina));
        $lampe = new Item($this->camille, 'Lampe', $this->salon);
        $etagere = new Storage($this->salon, 'Étagère');
        $this->persist($lampe, $etagere, $jouet);
        $reviewer = new ContributionReviewer($this->em, $this->validator);

        $rename = Contribution::editFields($leo, null, $lampe, ['name' => 'Lampe du salon']);
        $this->persist($rename);
        self::assertSame(ContributionBasis::Household, $rename->getBasis());
        self::assertSame($this->camille, $rename->getOwner());
        self::assertSame('Lampe', $lampe->getName(), 'rien avant validation');
        $reviewer->accept($rename, $this->camille);
        self::assertSame('Lampe du salon', $lampe->getName());

        // Lina (−18) range sa toupie sur l'étagère de sa mère : proposé, puis accepté.
        self::assertTrue($this->access->householdMayPropose($lina, $etagere));
        self::assertFalse($this->access->householdMayPropose($lina, $lampe), 'un mineur ne propose pas sur les objets');
        $place = Contribution::placePossession($lina, null, $jouet, $this->salon, $etagere);
        $this->persist($place);
        $reviewer->accept($place, $this->camille);
        self::assertSame($etagere, $jouet->getStorage());
        self::assertSame($lina, $jouet->getOwner(), 'la toupie reste à Lina');

        try {
            Contribution::editFields($this->marc, null, $lampe, ['name' => 'x']);
            self::fail('Sans partage, seul le foyer propose.');
        } catch (\LogicException) {
            $this->addToAssertionCount(1);
        }
    }

    public function testDatabaseGuards(): void
    {
        $this->assertDbRejects("UPDATE room SET created_by_id = NULL WHERE id = '{$this->salon->getId()}'", 'created_by_id');
        $this->assertDbRejects("INSERT INTO place_member (id, place_id, profile_id, created_at, updated_at) VALUES (gen_random_uuid(), '{$this->appart->getId()}', '{$this->camille->getId()}', now(), now())", 'uniq_place_member');
        $this->assertDbRejects("INSERT INTO place_decision (id, place_id, kind, status, requested_by_id, created_at, updated_at) VALUES (gen_random_uuid(), '{$this->appart->getId()}', 'INVITE_MEMBER', 'PENDING', '{$this->camille->getId()}', now(), now())", 'chk_place_decision_invitee');
        $this->assertDbRejects("INSERT INTO place_decision (id, place_id, kind, status, requested_by_id, created_at, updated_at) VALUES (gen_random_uuid(), '{$this->appart->getId()}', 'DELETE_PLACE', 'APPROVED', '{$this->camille->getId()}', now(), now())", 'chk_place_decision_closed');
        $share = new StorageShare($this->camille, $storage = new Storage($this->salon, 'Étagère'), Au::Friends);
        $this->persist($storage, $share);
        $this->assertDbRejects("UPDATE share SET storage_id = NULL WHERE id = '{$share->getId()}'", 'chk_share_target_storage_id');
    }
}
