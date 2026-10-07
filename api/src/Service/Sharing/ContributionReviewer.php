<?php

namespace App\Service\Sharing;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Sharing\CollectionEntry;
use App\Entity\Sharing\Contribution;
use App\Enum\Inventory\MoveReason;
use App\Enum\Sharing\ContributionKind;
use App\Service\Inventory\LocationMover;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Le propriétaire accepte une contribution : elle est appliquée dans la
 * même transaction que sa décision, et validée comme n'importe quelle
 * écriture (une correction qui casserait une règle est refusée).
 */
final class ContributionReviewer
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ValidatorInterface $validator,
    ) {
    }

    public function accept(Contribution $contribution, Profile $reviewer): void
    {
        $contribution->assertReviewer($reviewer);

        $this->em->wrapInTransaction(function () use ($contribution, $reviewer): void {
            $contribution->markAccepted($reviewer);
            $touched = match ($contribution->getKind()) {
                ContributionKind::PlacePossession => $this->placePossession($contribution),
                ContributionKind::AddCollectionEntry => $this->addEntry($contribution),
                ContributionKind::EditFields => $this->editFields($contribution),
            };

            $violations = $this->validator->validate($touched);
            if (\count($violations) > 0) {
                throw new \LogicException('La proposition ne respecte pas les règles : '.$violations->get(0)->getMessage());
            }
            $this->em->flush();
        });
    }

    /** L'objet reste à son auteur ; seul son emplacement change (avec sa trace). */
    private function placePossession(Contribution $c): Item|Garment
    {
        $possession = $c->getPossession();
        (new LocationMover($this->em))->move($possession, $c->getRoom(), $c->getStorage(), $c->getBox(), $c->getContributor(), MoveReason::ManualMove);

        return $possession;
    }

    private function addEntry(Contribution $c): CollectionEntry
    {
        $collection = $c->getCollection();
        $entry = match (true) {
            null !== $c->getPossession() && $c->getPossession() instanceof Item => CollectionEntry::forItem($collection, $c->getPossession(), $c->getCaption()),
            null !== $c->getPossession() => CollectionEntry::forGarment($collection, $c->getPossession(), $c->getCaption()),
            null !== $c->getMedia() => CollectionEntry::forMedia($collection, $c->getMedia(), $c->getCaption()),
            default => CollectionEntry::text($collection, (string) $c->getCaption()),
        };
        $this->em->persist($entry);

        return $entry;
    }

    /** Applique les corrections par les setters de la cible (liste blanche vérifiée à la création). */
    private function editFields(Contribution $c): object
    {
        $class = array_search($c->getTargetType(), Contribution::TARGET_TYPES, true);
        $target = (false !== $class ? $this->em->find($class, $c->getTargetId()) : null)
            ?? throw new \LogicException('Ce qui devait être corrigé n\'existe plus.');
        foreach ($c->getChanges() as $field => $value) {
            $target->{'set'.ucfirst($field)}($value);
        }

        return $target;
    }
}
