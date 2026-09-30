<?php

namespace App\Controller\Auth;

use Symfony\Component\Validator\Constraints as Assert;

/**
 * Ce que l'écran d'inscription envoie : le compte (email, mot de passe) et
 * l'identité du premier profil, adulte.
 */
final class RegisterRequest
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Email]
        public readonly string $email = '',
        #[Assert\NotBlank]
        #[Assert\Length(min: 10, max: 4096, minMessage: 'Au moins {{ limit }} caractères.')]
        #[Assert\NotCompromisedPassword(skipOnError: true)]
        public readonly string $password = '',
        #[Assert\NotBlank]
        public readonly string $firstName = '',
        #[Assert\NotBlank]
        public readonly string $lastName = '',
        #[Assert\NotBlank]
        #[Assert\Date]
        public readonly string $dateOfBirth = '',
        #[Assert\NotBlank]
        public readonly string $username = '',
    ) {
    }
}
