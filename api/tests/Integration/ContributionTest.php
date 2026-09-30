<?php

namespace App\Tests\Integration;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Item;
use App\Entity\Place\Box;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Relation\Friendship;
use App\Entity\Sharing\Collection;
use App\Entity\Sharing\CollectionShare;
use App\Entity\Sharing\Contribution;
use App\Entity\Sharing\ItemShare;
use App\Entity\Sharing\PlaceShare;
use App\Enum\Sharing\AccessLevel as A;
use App\Enum\Sharing\ContributionStatus;
use App\Enum\Sharing\ShareAudience as Au;
use App\Service\Sharing\ContributionReviewer;

final class ContributionTest extends DatabaseTestCase
{
    private Profile $camille;
    private Profile $sophie;
    private ContributionReviewer $reviewer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->camille = $this->profile('camille');
        $this->sophie = $this->profile('sophie');
        $this->persist((new Friendship($this->camille, $this->sophie))->accept());
        $this->reviewer = new ContributionReviewer($this->em, $this->validator);
    }

    /** @template T of \App\Entity\Sharing\Share @param T $share @return T */
    private function grantTo(Profile $who, object $share): object
    {
        $share->addRecipient($who);
        $this->persist($share, ...$share->getRecipients()->toArray());

        return $share;
    }

    public function testACartonLeftAtARelativeStaysTheContributorsAfterAcceptance(): void
    {
        $maison = new Place($this->camille, 'Maison');
        $grenier = new Room($maison, 'Grenier');
        $this->persist($maison, $grenier);
        $grant = $this->grantTo($this->sophie, new PlaceShare($this->camille, $maison, Au::Specific, A::Edit));
        $carton = new Item($this->sophie, 'Carton de livres', $this->room($this->sophie));
        $this->persist($carton);

        $proposal = Contribution::placePossession($this->sophie, $grant, $carton, $grenier);
        $this->persist($proposal);
        self::assertNotSame($grenier, $carton->getRoom(), 'rien ne bouge avant la validation');

        $this->reviewer->accept($proposal, $this->camille);
        self::assertSame(ContributionStatus::Accepted, $proposal->getStatus());
        self::assertSame($grenier, $carton->getRoom());
        self::assertSame($this->sophie, $carton->getOwner(), 'le carton reste à Sophie');
    }

    public function testMoodboardEntryAndCorrectionNeedValidation(): void
    {
        $board = new Collection($this->camille, 'Été');
        $this->persist($board);
        $grant = $this->grantTo($this->sophie, new CollectionShare($this->camille, $board, Au::Specific, A::Edit));

        $entry = Contribution::addToCollection($this->sophie, $grant, 'Tons sable');
        $rename = Contribution::editFields($this->sophie, $grant, ['name' => 'Été 2026']);
        $this->persist($entry, $rename);
        self::assertSame(0, $board->getEntries()->count());
        self::assertSame('Été', $board->getName());

        $this->reviewer->accept($entry, $this->camille);
        $rename->reject($this->camille, 'Je préfère le nom court');
        $this->em->flush();
        self::assertSame(1, (int) $this->fetchOne("SELECT count(*) FROM collection_entry WHERE collection_id = '{$board->getId()}'"));
        self::assertSame('Été', $board->getName(), 'correction refusée : rien ne change');
    }

    public function testContributionRules(): void
    {
        $robe = new Item($this->camille, 'Robe', $this->room($this->camille));
        $this->persist($robe);
        $readOnly = $this->grantTo($this->sophie, new ItemShare($this->camille, $robe, Au::Specific, A::Read));
        $edit = $this->grantTo($this->sophie, new ItemShare($this->camille, $robe, Au::Specific, A::Edit));
        $proposal = Contribution::editFields($this->sophie, $edit, ['name' => 'Robe rouge']);
        $this->persist($proposal);

        foreach ([
            'lire ne suffit pas pour proposer' => fn () => Contribution::editFields($this->sophie, $readOnly, ['name' => 'X']),
            'champ hors liste blanche' => fn () => Contribution::editFields($this->sophie, $edit, ['owner' => 'moi']),
            'pas de suppression déguisée en correction' => fn () => Contribution::editFields($this->sophie, $edit, ['deletedAt' => 'now']),
            'seul le propriétaire valide' => fn () => $this->reviewer->accept($proposal, $this->sophie),
            'déposer l\'objet d\'un autre' => fn () => Contribution::placePossession($this->sophie, $edit, $robe, $robe->getRoom()),
        ] as $label => $forbidden) {
            try {
                $forbidden();
                self::fail("Accepté : $label");
            } catch (\LogicException) {
                $this->addToAssertionCount(1);
            }
        }

        $this->reviewer->accept($proposal, $this->camille);
        self::assertSame('Robe rouge', $robe->getName());
        $this->expectException(\LogicException::class);
        $proposal->withdraw($this->sophie);
    }

    public function testDatabaseGuardsContributions(): void
    {
        $robe = new Item($this->camille, 'Robe', $this->room($this->camille));
        $this->persist($robe);
        $grant = $this->grantTo($this->sophie, new ItemShare($this->camille, $robe, Au::Specific, A::Edit));
        $proposal = Contribution::editFields($this->sophie, $grant, ['name' => 'Robe rouge']);
        $this->persist($proposal);

        $this->assertDbRejects("UPDATE contribution SET status = 'ACCEPTED'", 'chk_contribution_decided');
        $this->assertDbRejects("UPDATE contribution SET changes = NULL", 'chk_contribution_shape');
        $this->assertDbRejects("UPDATE share SET audience = 'FRIENDS' WHERE id = '{$grant->getId()}'", 'chk_share_edit_specific');
    }
}
