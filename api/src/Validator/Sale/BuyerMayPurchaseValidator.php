<?php

namespace App\Validator\Sale;

use App\Entity\Sale\Order;
use App\Enum\Identity\Permission;
use App\Enum\Identity\PermissionMode;
use App\Repository\Relation\FriendshipRepository;
use App\Security\PermissionResolver;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;
use Symfony\Component\Validator\Exception\UnexpectedValueException;

final class BuyerMayPurchaseValidator extends ConstraintValidator
{
    public function __construct(
        private readonly FriendshipRepository $friendships,
        private readonly PermissionResolver $permissions,
    ) {
    }

    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$constraint instanceof BuyerMayPurchase) {
            throw new UnexpectedTypeException($constraint, BuyerMayPurchase::class);
        }
        if (!$value instanceof Order) {
            throw new UnexpectedValueException($value, Order::class);
        }

        if (!$this->friendships->areFriends($value->getBuyer(), $value->getSeller())) {
            $this->context->buildViolation($constraint->notFriends)->atPath('buyer')->addViolation();
        }
        if (PermissionMode::Denied === $this->permissions->resolve($value->getBuyer(), Permission::Purchase)) {
            $this->context->buildViolation($constraint->denied)->atPath('buyer')->addViolation();
        }
    }
}
