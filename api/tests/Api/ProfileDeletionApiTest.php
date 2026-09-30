<?php

namespace App\Tests\Api;

use App\Entity\Identity\Profile;
use App\Enum\Identity\ProfileType;
use Doctrine\ORM\EntityManagerInterface;

final class ProfileDeletionApiTest extends ApiTestBase
{
    /** Ajoute Léa, profil enfant, au compte de $guardian ; renvoie son id. */
    private function addChild(array $guardian): string
    {
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $parent = $em->find(Profile::class, $guardian['profileId']);
        $lea = new Profile($parent->getAccount(), ProfileType::Child, 'Léa', 'T', new \DateTimeImmutable('2016-03-12'), 'lea', $parent);
        $em->persist($lea);
        $em->flush();

        return (string) $lea->getId();
    }

    public function testGuardianDeletesAChildAndItsItemsComeBack(): void
    {
        $rafael = $this->signUp('rafael');
        $lea = $this->addChild($rafael);
        $console = $this->call('POST', '/api/items', $rafael, ['name' => 'Console', 'room' => $this->roomOf($rafael, $lea)], $lea)->toArray();

        $this->call('DELETE', '/api/profiles/'.$lea, $rafael);
        self::assertResponseStatusCodeSame(204);

        self::assertCount(1, $this->call('GET', '/api/profiles', $rafael)->toArray()['member']);
        $item = $this->call('GET', $console['@id'], $rafael);
        self::assertResponseIsSuccessful('l\'objet de Léa est maintenant à Rafael');
        self::assertSame('Console', $item->toArray()['name']);
    }

    public function testDeletionRefusals(): void
    {
        $rafael = $this->signUp('rafael');
        $thomas = $this->signUp('thomas');
        $lea = $this->addChild($rafael);

        $this->call('DELETE', '/api/profiles/'.$lea, $thomas);
        self::assertResponseStatusCodeSame(403, 'un autre compte ne supprime pas Léa');

        $this->call('DELETE', '/api/profiles/'.$lea, $rafael, null, $lea);
        self::assertResponseStatusCodeSame(403, 'Léa ne se supprime pas elle-même');

        $this->call('DELETE', '/api/profiles/'.$rafael['profileId'], $rafael);
        self::assertResponseStatusCodeSame(422, 'supprimer un profil adulte n\'est pas encore défini');

        // Un prêt en cours bloque la suppression.
        $trottinette = $this->call('POST', '/api/items', $rafael, ['name' => 'Trottinette', 'room' => $this->roomOf($rafael, $lea)], $lea)->toArray();
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $item = $em->find(\App\Entity\Inventory\Item::class, $trottinette['id']);
        $loan = \App\Entity\Loan\Loan::offer($item, $em->find(Profile::class, $thomas['profileId']));
        $loan->markReceived($loan->getBorrower());
        $em->persist($loan);
        $em->flush();

        $this->call('DELETE', '/api/profiles/'.$lea, $rafael);
        self::assertResponseStatusCodeSame(409, 'un prêt en cours bloque la suppression');
    }
}
