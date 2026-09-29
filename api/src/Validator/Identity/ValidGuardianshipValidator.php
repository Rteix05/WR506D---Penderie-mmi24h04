<?php

namespace App\Validator\Identity;

use App\Entity\Identity\Profile;
use App\Enum\Identity\ProfileType;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;
use Symfony\Component\Validator\Exception\UnexpectedValueException;

final class ValidGuardianshipValidator extends ConstraintValidator
{
    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$constraint instanceof ValidGuardianship) {
            throw new UnexpectedTypeException($constraint, ValidGuardianship::class);
        }
        if (!$value instanceof Profile) {
            throw new UnexpectedValueException($value, Profile::class);
        }

        $guardian = $value->getGuardian();
        $isNew = null === $value->getCreatedAt();

        if ($value->isChild() && null === $guardian) {
            $this->violation($constraint->childWithoutGuardian, 'guardian');

            return;
        }

        // Règle de création seulement : la colonne reste nullable pour
        // absorber un passage CHILD → ADULT sans migration de données.
        if ($isNew && ProfileType::Adult === $value->getType() && null !== $guardian) {
            $this->violation($constraint->adultWithGuardian, 'guardian');
        }

        // Idem : à 18 ans, le profil reste CHILD jusqu'à ce que le tuteur
        // valide le détachement (décision client du 21/09).
        if ($isNew && $value->isChild() && $value->isOfAge()) {
            $this->context->buildViolation($constraint->childOfAge)
                ->setParameter('{{ age }}', (string) Profile::ADULT_AGE)
                ->atPath('dateOfBirth')
                ->addViolation();
        }

        if (null === $guardian) {
            return;
        }

        if ($guardian === $value || $guardian->getId()->equals($value->getId())) {
            $this->violation($constraint->selfGuardian, 'guardian');

            return;
        }

        if (ProfileType::Adult !== $guardian->getType()) {
            $this->violation($constraint->guardianNotAdult, 'guardian');
        }

        if (!$guardian->getAccount()->getId()->equals($value->getAccount()->getId())) {
            $this->violation($constraint->guardianOtherAccount, 'guardian');
        }
    }

    private function violation(string $message, string $path): void
    {
        $this->context->buildViolation($message)->atPath($path)->addViolation();
    }
}
