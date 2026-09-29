<?php

namespace App\Validator\Inventory;

use App\Entity\Inventory\AbstractPossession;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;
use Symfony\Component\Validator\Exception\UnexpectedValueException;

final class ValidLocationValidator extends ConstraintValidator
{
    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$constraint instanceof ValidLocation) {
            throw new UnexpectedTypeException($constraint, ValidLocation::class);
        }
        if (!$value instanceof AbstractPossession) {
            throw new UnexpectedValueException($value, AbstractPossession::class);
        }

        $room = $value->getRoom();
        $storage = $value->getStorage();
        $box = $value->getBox();

        if (null !== $storage && !$storage->getRoom()->getId()->equals($room->getId())) {
            $this->context->buildViolation($constraint->storageElsewhere)->atPath('storage')->addViolation();
        }

        if (null === $box) {
            return;
        }
        if (!$box->getRoom()->getId()->equals($room->getId())) {
            $this->context->buildViolation($constraint->boxElsewhere)->atPath('box')->addViolation();
        }
        $boxStorage = $box->getStorage();
        if ($boxStorage?->getId()->toRfc4122() !== $storage?->getId()->toRfc4122()) {
            $this->context->buildViolation($constraint->boxOnOtherStorage)->atPath('box')->addViolation();
        }
    }
}
