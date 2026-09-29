<?php

namespace App\Validator\Reference;

use App\Entity\Reference\AbstractCategory;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;
use Symfony\Component\Validator\Exception\UnexpectedValueException;

final class ValidCategoryTreeValidator extends ConstraintValidator
{
    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$constraint instanceof ValidCategoryTree) {
            throw new UnexpectedTypeException($constraint, ValidCategoryTree::class);
        }
        if (!$value instanceof AbstractCategory) {
            throw new UnexpectedValueException($value, AbstractCategory::class);
        }

        $parent = $value->getParent();
        if (null === $parent) {
            return;
        }

        $depth = $value->getDepth();
        if (\PHP_INT_MAX === $depth) {
            $this->context->buildViolation($constraint->cycle)->atPath('parent')->addViolation();

            return;
        }
        if ($depth > AbstractCategory::MAX_DEPTH) {
            $this->context->buildViolation($constraint->tooDeep)
                ->setParameter('{{ max }}', (string) AbstractCategory::MAX_DEPTH)
                ->atPath('parent')
                ->addViolation();
        }

        if ($value->isSystem() && !$parent->isSystem()) {
            $this->context->buildViolation($constraint->systemUnderUser)->atPath('parent')->addViolation();
        }

        $owner = $value->getOwner();
        $parentOwner = $parent->getOwner();
        if (null !== $owner && null !== $parentOwner && !$owner->getId()->equals($parentOwner->getId())) {
            $this->context->buildViolation($constraint->foreignParent)->atPath('parent')->addViolation();
        }
    }
}
