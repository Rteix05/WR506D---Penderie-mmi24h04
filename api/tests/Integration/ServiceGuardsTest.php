<?php

namespace App\Tests\Integration;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Sharing\Share;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use App\Service\Inventory\LocationMover;
use App\Service\Media\MediaStorage;
use App\Service\Sharing\ShareTargets;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Uuid;

/**
 * Les garde-fous des services : ce qu'ils refusent d'eux-mêmes, même si un
 * contrôleur ou une donnée venue d'ailleurs le leur demandait.
 */
final class ServiceGuardsTest extends DatabaseTestCase
{
    public function testASketchIsCompletedBeforeBeingMoved(): void
    {
        $camille = $this->profile('camille');
        $sketch = Garment::sketch($camille, 'Veste trouvée');

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('à compléter');
        (new LocationMover($this->em))->move($sketch, $this->room($camille), null, null, $camille);
    }

    public function testMediaPathsNeverClimbOutOfTheMediaFolder(): void
    {
        $storage = self::getContainer()->get(MediaStorage::class);

        $this->expectException(\InvalidArgumentException::class);
        $storage->absolute('2026/10/../../../.env');
    }

    public function testShareTargetsKnowEveryTypeAndNothingElse(): void
    {
        $targets = new ShareTargets($this->em);
        $camille = $this->profile('camille');

        // Une catégorie personnelle se corrige par une proposition : type connu, cible absente.
        try {
            $targets->find('ITEM_CATEGORY', Uuid::v7()->toRfc4122());
            self::fail('Cible absente trouvée.');
        } catch (NotFoundHttpException) {
            $this->addToAssertionCount(1);
        }
        try {
            $targets->find('VOITURE', Uuid::v7()->toRfc4122());
            self::fail('Type inconnu accepté.');
        } catch (\LogicException) {
            $this->addToAssertionCount(1);
        }

        // Un sous-type de partage que la table ne connaît pas (ajouté sans la mettre à jour).
        $orphan = new class($camille) extends Share {
            public function __construct(private readonly Profile $targetOwner)
            {
                parent::__construct($targetOwner, ShareAudience::Friends, AccessLevel::Read);
            }

            public function getTargetOwner(): Profile
            {
                return $this->targetOwner;
            }

            public function getTargetId(): Uuid
            {
                return Uuid::v7();
            }
        };
        foreach ([fn () => $targets->targetOf($orphan), fn () => $targets->typeOf($orphan)] as $call) {
            try {
                $call();
                self::fail('Partage sans cible accepté.');
            } catch (\LogicException $e) {
                self::assertSame('Partage sans cible connue.', $e->getMessage());
            }
        }
    }
}
