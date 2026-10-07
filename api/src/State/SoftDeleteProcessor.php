<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Inventory\AbstractPossession;
use Doctrine\ORM\EntityManagerInterface;

/**
 * DELETE sur un objet ou un vêtement : suppression douce (deletedAt), pas
 * de DELETE SQL. Un objet vendu ou prêté reste référencé par sa commande
 * et son historique (MDD).
 *
 * @implements ProcessorInterface<AbstractPossession, null>
 */
final class SoftDeleteProcessor implements ProcessorInterface
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        \assert($data instanceof AbstractPossession);
        $data->softDelete();
        $this->em->flush();

        return null;
    }
}
