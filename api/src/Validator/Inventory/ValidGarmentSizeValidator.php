<?php

namespace App\Validator\Inventory;

use App\Entity\Inventory\Garment;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;
use Symfony\Component\Validator\Exception\UnexpectedValueException;

final class ValidGarmentSizeValidator extends ConstraintValidator
{
    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$constraint instanceof ValidGarmentSize) {
            throw new UnexpectedTypeException($constraint, ValidGarmentSize::class);
        }
        if (!$value instanceof Garment) {
            throw new UnexpectedValueException($value, Garment::class);
        }

        $scale = $value->getCategory()->getSizeSystem();
        $size = $value->getSize();

        if (null !== $size) {
            if (null === $scale) {
                $this->context->buildViolation($constraint->noScale)->atPath('size')->addViolation();
            } elseif (!$size->getSizeSystem()->getId()->equals($scale->getId())) {
                $this->context->buildViolation($constraint->otherScale)
                    ->setParameter('{{ scale }}', $scale->getName())
                    ->atPath('size')
                    ->addViolation();
            }
        }

        if (null !== $value->getSizeLabel() && null !== $scale && !$scale->allowsFreeText()) {
            $this->context->buildViolation($constraint->freeTextForbidden)
                ->setParameter('{{ scale }}', $scale->getName())
                ->atPath('sizeLabel')
                ->addViolation();
        }
    }
}
