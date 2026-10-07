<?php

namespace App\Controller\Auth;

use App\Entity\Identity\Account;
use App\Entity\Identity\Profile;
use App\Enum\Identity\ProfileType;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\ConstraintViolationListInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Inscription : crée le compte et son premier profil, adulte et par
 * défaut. La connexion se fait ensuite par /api/auth/login.
 */
final class RegisterController extends AbstractController
{
    #[Route('/api/auth/register', name: 'api_register', methods: ['POST'])]
    public function __invoke(
        #[MapRequestPayload] RegisterRequest $request,
        UserPasswordHasherInterface $hasher,
        ValidatorInterface $validator,
        EntityManagerInterface $em,
    ): JsonResponse {
        $account = new Account(mb_strtolower(trim($request->email)));
        $account->setPassword($hasher->hashPassword($account, $request->password));
        $profile = (new Profile(
            $account,
            ProfileType::Adult,
            trim($request->firstName),
            trim($request->lastName),
            new \DateTimeImmutable($request->dateOfBirth),
            trim($request->username),
        ))->setIsDefault(true);

        // Les règles des entités (email et username uniques, âge, format
        // du username…) s'appliquent comme partout ailleurs.
        foreach ([$validator->validate($account), $validator->validate($profile)] as $violations) {
            if (\count($violations) > 0) {
                return $this->violations($violations);
            }
        }

        $em->persist($account);
        $em->persist($profile);
        $em->flush();

        return $this->json([
            'account' => ['id' => $account->getId(), 'email' => $account->getEmail()],
            'profile' => ['id' => $profile->getId(), 'username' => $profile->getUsername()],
        ], Response::HTTP_CREATED);
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
