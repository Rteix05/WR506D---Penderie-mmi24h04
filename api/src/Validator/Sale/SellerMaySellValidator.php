<?php

namespace App\Validator\Sale;

use App\Entity\Sale\Listing;
use App\Enum\Identity\Permission;
use App\Enum\Identity\PermissionMode;
use App\Security\PermissionResolver;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;
use Symfony\Component\Validator\Exception\UnexpectedValueException;

final class SellerMaySellValidator extends ConstraintValidator
{
    public function __construct(private readonly PermissionResolver $permissions)
    {
    }

    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$constraint instanceof SellerMaySell) {
            throw new UnexpectedTypeException($constraint, SellerMaySell::class);
        }
        if (!$value instanceof Listing) {
            throw new UnexpectedValueException($value, Listing::class);
        }

        if (PermissionMode::Denied === $this->permissions->resolve($value->getSeller(), Permission::Sell)) {
            $this->context->buildViolation($constraint->denied)->atPath('seller')->addViolation();
        }
    }
}
