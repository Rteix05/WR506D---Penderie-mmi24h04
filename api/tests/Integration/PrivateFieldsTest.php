<?php

namespace App\Tests\Integration;

use App\Entity\Inventory\Item;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;

/**
 * Sans profil connecté (un lien public, par exemple), une ressource se
 * sérialise sans ses champs privés, sans son emplacement, sans le niveau
 * d'accès ni les URL de photos (qui exigent un jeton).
 */
final class PrivateFieldsTest extends DatabaseTestCase
{
    public function testAnonymousViewerGetsNoPrivateField(): void
    {
        $camille = $this->profile('camille');
        $lampe = (new Item($camille, 'Lampe', $this->room($camille)))->setNotes('Cachée derrière le canapé');
        $this->persist($lampe);

        $data = self::getContainer()->get(NormalizerInterface::class)->normalize($lampe, 'jsonld', ['groups' => ['possession:read', 'item:read']]);

        self::assertIsArray($data);
        self::assertSame('Lampe', $data['name']);
        foreach (['notes', 'room', 'access', 'photos'] as $private) {
            self::assertArrayNotHasKey($private, $data);
        }
    }
}
