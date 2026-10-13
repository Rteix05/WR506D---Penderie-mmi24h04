<?php

namespace App\Tests\Api;

/**
 * Les profils d'un compte (/api/account/profiles) : un adulte crée un
 * profil enfant ou proche dont il devient le tuteur, le modifie, règle ses
 * autorisations, le supprime. L'enfant ne touche ni à sa tutelle ni à ses
 * autorisations.
 *
 * @phpstan-import-type TestUser from ApiTestBase
 */
final class AccountProfileApiTest extends ApiTestBase
{
    /**
     * @param array<string, mixed> $body
     * @param TestUser $user
     * @return array<string, mixed>
     */
    private function create(array $user, array $body, ?string $as = null): array
    {
        return $this->call('POST', '/api/account/profiles', $user, $body, $as)->toArray(false);
    }

    /**
     * @param TestUser $user
     * @return array<string, mixed>
     */
    private function child(array $user): array
    {
        $noe = $this->create($user, ['type' => 'CHILD', 'firstName' => 'Noé', 'dateOfBirth' => '2017-05-02']);
        self::assertResponseStatusCodeSame(201);

        return $noe;
    }

    /**
     * @param TestUser $user
     * @return array<string, mixed>
     */
    private function modes(array $user, string $profileId, ?string $as = null): array
    {
        $body = $this->call('GET', '/api/account/profiles/'.$profileId.'/permissions', $user, null, $as)->toArray();

        return array_column($body['permissions'], 'mode', 'permission');
    }

    public function testAnAdultCreatesAChildProfile(): void
    {
        $rafael = $this->signUp('rafael');
        $noe = $this->child($rafael);

        self::assertSame('CHILD', $noe['type']);
        self::assertSame('Test', $noe['lastName'], 'sans nom, le profil prend celui du tuteur');
        self::assertMatchesRegularExpression('/^noe\.\d{4}$/', $noe['username'], 'un identifiant libre est proposé à partir du prénom');
        self::assertSame($rafael['profileId'], $noe['guardian']['id']);
        self::assertTrue($noe['canManage']);
        self::assertTrue($noe['canDelete']);
        self::assertSame(['items' => 0, 'garments' => 0, 'activeLoans' => 0], $noe['counts']);

        $list = $this->call('GET', '/api/account/profiles', $rafael)->toArray();
        self::assertSame(['Rafael', 'Noé'], array_column($list, 'displayName'), 'le profil principal d\'abord');
        self::assertTrue($list[0]['active']);
        self::assertFalse($list[0]['canManage'], 'on ne gère pas son propre profil adulte');

        // Le nouveau profil s'ouvre avec l'en-tête X-Profile, et possède ses objets.
        $this->call('POST', '/api/items', $rafael, ['name' => 'Lego', 'room' => $this->roomOf($rafael, $noe['id'])], $noe['id']);
        self::assertResponseStatusCodeSame(201);
        $list = $this->call('GET', '/api/account/profiles', $rafael)->toArray();
        self::assertSame(1, $list[1]['counts']['items']);
    }

    public function testCreationRules(): void
    {
        $rafael = $this->signUp('rafael');

        $this->create($rafael, ['type' => 'ADULT', 'firstName' => 'Léa', 'dateOfBirth' => '1990-01-01']);
        self::assertResponseStatusCodeSame(400, 'un profil adulte s\'inscrit lui-même');

        $body = $this->create($rafael, ['type' => 'CHILD', 'firstName' => 'Léa', 'dateOfBirth' => '1990-01-01']);
        self::assertResponseStatusCodeSame(422, 'un enfant est mineur');
        self::assertSame('dateOfBirth', $body['violations'][0]['propertyPath']);

        $this->create($rafael, ['type' => 'RELATIVE', 'firstName' => 'Mamie', 'dateOfBirth' => '2015-01-01']);
        self::assertResponseStatusCodeSame(422, 'un proche est majeur');

        $this->create($rafael, ['type' => 'CHILD', 'firstName' => 'Noé', 'dateOfBirth' => '2017-05-02', 'username' => 'rafael']);
        self::assertResponseStatusCodeSame(422, 'identifiant déjà pris');

        $mamie = $this->create($rafael, ['type' => 'RELATIVE', 'firstName' => 'Mamie', 'lastName' => 'Durand', 'dateOfBirth' => '1950-03-10']);
        self::assertResponseStatusCodeSame(201);
        self::assertSame($rafael['profileId'], $mamie['guardian']['id'], 'un proche est géré par celui qui l\'a créé');

        // Un enfant ne crée pas de profil.
        $noe = $this->child($rafael);
        $this->create($rafael, ['type' => 'CHILD', 'firstName' => 'Zoé', 'dateOfBirth' => '2019-01-01'], $noe['id']);
        self::assertResponseStatusCodeSame(403);
    }

    public function testGuardianEditsAndTheChildOnlyItsDisplayName(): void
    {
        $rafael = $this->signUp('rafael');
        $noe = $this->child($rafael);
        $url = '/api/account/profiles/'.$noe['id'];

        $edited = $this->call('PATCH', $url, $rafael, ['firstName' => 'Noé-Paul', 'displayName' => 'Noénoé', 'bio' => 'Fan de Lego'])->toArray();
        self::assertResponseIsSuccessful();
        self::assertSame('Noé-Paul', $edited['firstName']);
        self::assertSame('Fan de Lego', $edited['bio']);

        $this->call('PATCH', $url, $rafael, ['displayName' => 'Le grand Noé'], $noe['id']);
        self::assertResponseIsSuccessful('un profil change son nom affiché');
        $this->call('PATCH', $url, $rafael, ['dateOfBirth' => '2000-01-01'], $noe['id']);
        self::assertResponseStatusCodeSame(403, 'pas sa date de naissance');

        $this->call('PATCH', $url, $rafael, ['type' => 'RELATIVE']);
        self::assertResponseStatusCodeSame(422, 'Noé est mineur : il reste enfant');

        $this->call('PATCH', $url, $rafael, ['firstName' => '']);
        self::assertResponseStatusCodeSame(422);
        $list = $this->call('GET', '/api/account/profiles', $rafael)->toArray();
        self::assertSame('Noé-Paul', $list[1]['firstName'], 'un changement refusé n\'est pas enregistré');
    }

    public function testAChildOfAgeBecomesARelative(): void
    {
        $rafael = $this->signUp('rafael');
        $noe = $this->child($rafael);
        $url = '/api/account/profiles/'.$noe['id'];

        $this->call('PATCH', $url, $rafael, ['dateOfBirth' => '2006-01-01']);
        $relative = $this->call('PATCH', $url, $rafael, ['type' => 'RELATIVE'])->toArray();
        self::assertResponseIsSuccessful();
        self::assertSame('RELATIVE', $relative['type']);
        self::assertSame('ALLOWED', $this->modes($rafael, $noe['id'])['SELL'], 'un proche n\'a plus les restrictions d\'un enfant');
    }

    public function testGuardianSetsPermissions(): void
    {
        $rafael = $this->signUp('rafael');
        $noe = $this->child($rafael);
        $url = '/api/account/profiles/'.$noe['id'].'/permissions';

        $modes = $this->modes($rafael, $noe['id']);
        self::assertSame('ALLOWED', $modes['ITEM_CREATE']);
        self::assertSame('REQUIRES_APPROVAL', $modes['LOAN_BORROW']);
        self::assertSame('DENIED', $modes['SELL']);

        $body = $this->call('PUT', $url, $rafael, ['modes' => ['LOAN_BORROW' => 'ALLOWED', 'COMMENT_WRITE' => 'DENIED']])->toArray();
        self::assertResponseIsSuccessful();
        $set = array_column($body['permissions'], null, 'permission');
        self::assertSame('ALLOWED', $set['LOAN_BORROW']['mode']);
        self::assertTrue($set['LOAN_BORROW']['custom']);
        self::assertSame('DENIED', $set['COMMENT_WRITE']['mode']);

        // Revenir à la politique du type efface l'exception.
        $body = $this->call('PUT', $url, $rafael, ['modes' => ['LOAN_BORROW' => 'REQUIRES_APPROVAL']])->toArray();
        $set = array_column($body['permissions'], null, 'permission');
        self::assertFalse($set['LOAN_BORROW']['custom']);
        self::assertTrue($set['COMMENT_WRITE']['custom'], 'les autres réglages restent');

        // Le réglage s'applique : Noé ne vend pas, sauf si son tuteur l'y autorise.
        $this->call('PUT', $url, $rafael, ['modes' => ['SELL' => 'ALLOWED']]);
        self::assertSame('ALLOWED', $this->modes($rafael, $noe['id'], $noe['id'])['SELL'], 'Noé lit ses autorisations');

        $this->call('PUT', $url, $rafael, ['modes' => ['SELL' => 'ALLOWED']], $noe['id']);
        self::assertResponseStatusCodeSame(403, 'Noé ne règle pas ses propres autorisations');
        $this->call('PUT', $url, $rafael, ['modes' => ['VOLER' => 'ALLOWED']]);
        self::assertResponseStatusCodeSame(400);
    }

    public function testAnotherAccountSeesNothing(): void
    {
        $rafael = $this->signUp('rafael');
        $thomas = $this->signUp('thomas');
        $noe = $this->child($rafael);

        $this->call('GET', '/api/account/profiles/'.$noe['id'].'/permissions', $thomas);
        self::assertResponseStatusCodeSame(404);
        $this->call('PATCH', '/api/account/profiles/'.$noe['id'], $thomas, ['displayName' => 'Piraté']);
        self::assertResponseStatusCodeSame(404);
        self::assertCount(1, $this->call('GET', '/api/account/profiles', $thomas)->toArray());
    }

    public function testGuardianDeletesARelative(): void
    {
        $rafael = $this->signUp('rafael');
        $mamie = $this->create($rafael, ['type' => 'RELATIVE', 'firstName' => 'Mamie', 'dateOfBirth' => '1950-03-10']);
        $this->call('POST', '/api/items', $rafael, ['name' => 'Service à thé', 'room' => $this->roomOf($rafael, $mamie['id'])], $mamie['id']);

        $this->call('DELETE', '/api/profiles/'.$mamie['id'], $rafael);
        self::assertResponseStatusCodeSame(204);
        $list = $this->call('GET', '/api/account/profiles', $rafael)->toArray();
        self::assertCount(1, $list);
        self::assertSame(1, $list[0]['counts']['items'], 'les biens du proche reviennent à son tuteur');
    }
}
