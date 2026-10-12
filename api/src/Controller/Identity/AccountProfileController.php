<?php

namespace App\Controller\Identity;

use App\Entity\Identity\Profile;
use App\Entity\Identity\ProfilePermission;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Loan\Loan;
use App\Enum\Identity\Permission;
use App\Enum\Identity\PermissionMode;
use App\Enum\Identity\ProfileType;
use App\Enum\Loan\LoanStatus;
use App\Security\CurrentProfile;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Validator\ConstraintViolationListInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Les profils d'un compte (MDD : un Account, 1 à n Profile).
 *
 * Un compte, c'est une connexion et plusieurs identités : l'adulte qui
 * s'est inscrit, ses enfants (CHILD, sous tutelle) et les proches qu'il
 * gère (RELATIVE : majeurs, gérés par le compte). Chaque profil a sa
 * propre penderie.
 *
 *  - GET  /api/account/profiles : les profils du compte, avec ce que
 *    chacun possède et ce que le profil actif a le droit d'en faire.
 *  - POST /api/account/profiles : un adulte crée un profil enfant ou
 *    proche, dont il devient le tuteur.
 *  - PATCH /api/account/profiles/{id} : identité (prénom, nom, nom
 *    affiché, naissance, bio). Le tuteur fait tout ; un profil modifie
 *    seulement son nom affiché et sa bio. Le type ne change qu'à la
 *    majorité (CHILD › RELATIVE), par le tuteur.
 *  - GET, PUT /api/account/profiles/{id}/permissions : le mode de chaque
 *    permission (ALLOWED, REQUIRES_APPROVAL, DENIED). Seul le tuteur les
 *    règle, jamais le profil lui-même (MDD). Seuls les écarts à la
 *    politique du type sont enregistrés (ProfilePermission).
 *
 * La suppression reste DELETE /api/profiles/{id} (ProfileDeleter).
 */
final class AccountProfileController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CurrentProfile $current,
        private readonly ValidatorInterface $validator,
    ) {
    }

    #[Route('/api/account/profiles', name: 'api_account_profile_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $profiles = $this->current->account()->getProfiles()->toArray();
        // Le profil principal d'abord, puis par date de création.
        usort($profiles, static fn (Profile $a, Profile $b) => [$b->isDefault(), $a->getCreatedAt()] <=> [$a->isDefault(), $b->getCreatedAt()]);

        return $this->json(array_map($this->describe(...), $profiles));
    }

    /**
     * Corps : {type: CHILD | RELATIVE, firstName, lastName?, dateOfBirth, displayName?, username?}.
     * Sans nom, le profil prend celui du tuteur ; sans identifiant, un
     * identifiant libre est proposé à partir du prénom (« noe.4821 »).
     */
    #[Route('/api/account/profiles', name: 'api_account_profile_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $me = $this->current->get();
        if (ProfileType::Adult !== $me->getType()) {
            throw new AccessDeniedHttpException('Seul un profil adulte crée les profils du compte.');
        }
        $body = $request->toArray();
        $type = ProfileType::tryFrom((string) ($body['type'] ?? ''));
        if (!\in_array($type, [ProfileType::Child, ProfileType::Relative], true)) {
            throw new BadRequestHttpException('« type » vaut CHILD (enfant) ou RELATIVE (proche géré par le compte).');
        }
        $firstName = trim(self::text($body, 'firstName') ?? '');
        $lastName = trim(self::text($body, 'lastName') ?? $me->getLastName());

        $profile = new Profile(
            $me->getAccount(),
            $type,
            $firstName,
            $lastName,
            self::date($body['dateOfBirth'] ?? null),
            self::text($body, 'username') ?? $this->freeUsername($firstName),
            $me,
        );
        if (null !== ($displayName = self::text($body, 'displayName'))) {
            $profile->setDisplayName(trim($displayName));
        }
        // Un proche est majeur : le profil enfant est fait pour les mineurs.
        if (ProfileType::Relative === $type && !$profile->isOfAge()) {
            return self::invalid('dateOfBirth', \sprintf('Un proche a au moins %d ans : crée plutôt un profil enfant.', Profile::ADULT_AGE));
        }
        if (\count($violations = $this->validator->validate($profile)) > 0) {
            return $this->violations($violations);
        }
        $this->em->persist($profile);
        $this->em->flush();

        return $this->json($this->describe($profile), Response::HTTP_CREATED);
    }

    /** Corps : {firstName?, lastName?, displayName?, dateOfBirth?, bio?, type?} */
    #[Route('/api/account/profiles/{id}', name: 'api_account_profile_update', methods: ['PATCH'], requirements: ['id' => Requirement::UUID])]
    public function update(string $id, Request $request): JsonResponse
    {
        $profile = $this->profile($id);
        $manager = $this->manages($profile);
        $self = $profile->getId()->equals($this->current->get()->getId());
        if (!$manager && !$self) {
            throw new AccessDeniedHttpException('Seul le tuteur modifie ce profil.');
        }
        $body = $request->toArray();
        $identity = array_intersect(array_keys($body), ['firstName', 'lastName', 'dateOfBirth', 'type']);
        if ([] !== $identity && !$manager) {
            throw new AccessDeniedHttpException('Ton prénom, ton nom, ta date de naissance et ton type de profil se changent par ton tuteur.');
        }

        if (\array_key_exists('firstName', $body)) {
            $profile->setFirstName(trim(self::text($body, 'firstName') ?? ''));
        }
        if (\array_key_exists('lastName', $body)) {
            $profile->setLastName(trim(self::text($body, 'lastName') ?? ''));
        }
        if (\array_key_exists('displayName', $body)) {
            $profile->setDisplayName(trim(self::text($body, 'displayName') ?? ''));
        }
        if (\array_key_exists('bio', $body)) {
            $bio = self::text($body, 'bio');
            $profile->setBio(null === $bio || '' === trim($bio) ? null : trim($bio));
        }
        if (\array_key_exists('dateOfBirth', $body)) {
            $profile->setDateOfBirth(self::date($body['dateOfBirth']));
        }
        if (\array_key_exists('type', $body)) {
            $type = ProfileType::tryFrom((string) $body['type']);
            if (null === $type) {
                throw new BadRequestHttpException('« type » vaut CHILD ou RELATIVE.');
            }
            $this->changeType($profile, $type);
        }
        if (\count($violations = $this->validator->validate($profile)) > 0) {
            // Rien n'est enregistré : on oublie les changements faits en mémoire.
            $this->em->refresh($profile);

            return $this->violations($violations);
        }
        $this->em->flush();

        return $this->json($this->describe($profile));
    }

    #[Route('/api/account/profiles/{id}/permissions', name: 'api_account_profile_permissions', methods: ['GET'], requirements: ['id' => Requirement::UUID])]
    public function permissions(string $id): JsonResponse
    {
        $profile = $this->profile($id);

        return $this->json($this->describePermissions($profile));
    }

    /**
     * Corps : {modes: {SELL: "DENIED", LOAN_BORROW: "ALLOWED", …}}. Une
     * permission ramenée à la politique de son type perd son exception :
     * la table ne garde que les écarts.
     */
    #[Route('/api/account/profiles/{id}/permissions', name: 'api_account_profile_permissions_update', methods: ['PUT'], requirements: ['id' => Requirement::UUID])]
    public function updatePermissions(string $id, Request $request): JsonResponse
    {
        $profile = $this->profile($id);
        if (!$this->manages($profile)) {
            throw new AccessDeniedHttpException('Seul le tuteur règle les autorisations de ce profil.');
        }
        $modes = $request->toArray()['modes'] ?? null;
        if (!\is_array($modes)) {
            throw new BadRequestHttpException('« modes » associe une permission à son mode : {"SELL": "DENIED"}.');
        }

        $me = $this->current->get();
        $overrides = [];
        foreach ($profile->getPermissions() as $override) {
            $overrides[$override->getPermission()->value] = $override;
        }
        foreach ($modes as $key => $value) {
            $permission = Permission::tryFrom((string) $key);
            $mode = \is_string($value) ? PermissionMode::tryFrom($value) : null;
            if (null === $permission || null === $mode) {
                throw new BadRequestHttpException(\sprintf('Permission ou mode inconnu : %s.', $key));
            }
            $override = $overrides[$permission->value] ?? null;
            if ($mode === $permission->defaultModeFor($profile->getType())) {
                if (null !== $override) {
                    $profile->getPermissions()->removeElement($override);
                    $this->em->remove($override);
                }
            } elseif (null !== $override) {
                $override->changeMode($mode, $me);
            } else {
                $override = new ProfilePermission($profile, $permission, $mode, $me);
                $profile->getPermissions()->add($override);
                $this->em->persist($override);
            }
        }
        $this->em->flush();

        return $this->json($this->describePermissions($profile));
    }

    /** Un profil du compte connecté ; 404 sinon (on ne révèle pas les profils des autres). */
    private function profile(string $id): Profile
    {
        $profile = $this->em->find(Profile::class, $id);
        if (null === $profile || !$profile->getAccount()->getId()->equals($this->current->account()->getId())) {
            throw new NotFoundHttpException('Profil introuvable.');
        }

        return $profile;
    }

    /**
     * Gérer un profil : être un adulte du compte, et le profil visé est un
     * enfant ou un proche (jamais soi-même, jamais un autre adulte, qui est
     * autonome). Le MDD réserve les permissions au tuteur « ou un profil
     * ADULT du même compte » : les deux parents d'un enfant le gèrent.
     */
    private function manages(Profile $profile): bool
    {
        $me = $this->current->get();

        return ProfileType::Adult === $me->getType()
            && !$profile->getId()->equals($me->getId())
            && \in_array($profile->getType(), [ProfileType::Child, ProfileType::Relative], true)
            && $profile->getAccount()->getId()->equals($me->getAccount()->getId());
    }

    /**
     * Seul changement de type défini : l'enfant devenu majeur passe proche
     * (décision client du 21/09 : à 18 ans, le tuteur valide le
     * détachement). Il garde son tuteur, qui gère toujours le profil.
     */
    private function changeType(Profile $profile, ProfileType $type): void
    {
        if ($type === $profile->getType()) {
            return;
        }
        if (!(ProfileType::Child === $profile->getType() && ProfileType::Relative === $type)) {
            throw new \DomainException('Seul un profil enfant devenu majeur change de type : il passe proche.');
        }
        if (!$profile->isOfAge()) {
            throw new \DomainException(\sprintf('Un profil enfant passe proche à %d ans.', Profile::ADULT_AGE));
        }
        $profile->setType($type);
    }

    /** Un identifiant libre à partir du prénom : « noe.4821 ». */
    private function freeUsername(string $firstName): string
    {
        $base = strtolower(trim((string) preg_replace('/[^a-z0-9]+/i', '-', (string) iconv('UTF-8', 'ASCII//TRANSLIT', $firstName)), '-')) ?: 'profil';
        $base = substr($base, 0, 24);
        $repository = $this->em->getRepository(Profile::class);
        do {
            $username = $base.'.'.random_int(1000, 9999);
        } while (null !== $repository->findOneBy(['username' => $username]));

        return $username;
    }

    /** @return array<string, mixed> */
    private function describe(Profile $profile): array
    {
        $me = $this->current->get();
        $guardian = $profile->getGuardian();
        $count = fn (string $class) => $this->em->getRepository($class)->count(['owner' => $profile, 'deletedAt' => null]);

        return [
            'id' => (string) $profile->getId(),
            '@id' => '/api/profiles/'.$profile->getId(),
            'type' => $profile->getType()->value,
            'firstName' => $profile->getFirstName(),
            'lastName' => $profile->getLastName(),
            'displayName' => $profile->getDisplayName(),
            'username' => $profile->getUsername(),
            'dateOfBirth' => $profile->getDateOfBirth()->format('Y-m-d'),
            'age' => $profile->getAge(),
            'bio' => $profile->getBio(),
            'isDefault' => $profile->isDefault(),
            'suspended' => null !== $profile->getSuspendedAt(),
            'createdAt' => $profile->getCreatedAt()?->format(\DATE_ATOM),
            'guardian' => null === $guardian ? null : ['id' => (string) $guardian->getId(), 'displayName' => $guardian->getDisplayName()],
            'counts' => [
                'items' => $count(Item::class),
                'garments' => $count(Garment::class),
                'activeLoans' => $this->em->getRepository(Loan::class)->count(['lender' => $profile, 'status' => LoanStatus::Active]),
            ],
            'active' => $profile->getId()->equals($me->getId()),
            // Ce que le profil actif peut faire de ce profil : l'app montre ou cache les actions.
            'canManage' => $this->manages($profile),
            'canDelete' => null !== $guardian && $guardian->getId()->equals($me->getId()) && \in_array($profile->getType(), [ProfileType::Child, ProfileType::Relative], true),
        ];
    }

    /** @return array<string, mixed> */
    private function describePermissions(Profile $profile): array
    {
        $overrides = [];
        foreach ($profile->getPermissions() as $override) {
            $overrides[$override->getPermission()->value] = $override->getMode();
        }

        return [
            'profile' => (string) $profile->getId(),
            'type' => $profile->getType()->value,
            'canManage' => $this->manages($profile),
            'permissions' => array_map(static fn (Permission $p) => [
                'permission' => $p->value,
                'mode' => ($overrides[$p->value] ?? $p->defaultModeFor($profile->getType()))->value,
                'default' => $p->defaultModeFor($profile->getType())->value,
                'custom' => isset($overrides[$p->value]),
            ], Permission::cases()),
        ];
    }

    /** @param array<string, mixed> $body */
    private static function text(array $body, string $key): ?string
    {
        $value = $body[$key] ?? null;
        if (null !== $value && !\is_string($value)) {
            throw new BadRequestHttpException(\sprintf('« %s » doit être un texte.', $key));
        }

        return $value;
    }

    private static function date(mixed $value): \DateTimeImmutable
    {
        $date = \is_string($value) ? \DateTimeImmutable::createFromFormat('!Y-m-d', $value) : false;
        if (false === $date) {
            throw new BadRequestHttpException('« dateOfBirth » est une date AAAA-MM-JJ.');
        }

        return $date;
    }

    private static function invalid(string $path, string $message): JsonResponse
    {
        return new JsonResponse(['title' => 'Données invalides', 'violations' => [['propertyPath' => $path, 'message' => $message]]], Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    private function violations(ConstraintViolationListInterface $violations): JsonResponse
    {
        $errors = [];
        foreach ($violations as $violation) {
            $errors[] = ['propertyPath' => $violation->getPropertyPath(), 'message' => $violation->getMessage()];
        }

        return $this->json(['title' => 'Données invalides', 'violations' => $errors], Response::HTTP_UNPROCESSABLE_ENTITY);
    }
}
