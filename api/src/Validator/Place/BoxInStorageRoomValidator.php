<?php

namespace App\Validator\Place;

use App\Entity\Place\Box;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;
use Symfony\Component\Validator\Exception\UnexpectedValueException;

final class BoxInStorageRoomValidator extends ConstraintValidator
{
    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$constraint instanceof BoxInStorageRoom) {
            throw new UnexpectedTypeException($constraint, BoxInStorageRoom::class);
        }
        if (!$value instanceof Box) {
            throw new UnexpectedValueException($value, Box::class);
        }

        $storage = $value->getStorage();
        if (null !== $storage && !$storage->getRoom()->getId()->equals($value->getRoom()->getId())) {
            $this->context->buildViolation($constraint->message)->atPath('storage')->addViolation();
        }
    }
}
