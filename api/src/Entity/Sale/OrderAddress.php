<?php

namespace App\Entity\Sale;

use App\Enum\Sale\AddressRole;
use App\Repository\Sale\OrderAddressRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * L'adresse figée au moment de l'achat : une copie de valeurs, pas une
 * clé vers le carnet. Aucun setter, et en base le déclencheur de garde
 * refuse toute modification après création (MDD).
 */
#[ORM\Entity(repositoryClass: OrderAddressRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_order_address_role', columns: ['order_id', 'role'])]
class OrderAddress
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Order::class, inversedBy: 'addresses')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Order $order;

    #[ORM\Column(length: 20, enumType: AddressRole::class)]
    private AddressRole $role;

    #[ORM\Column(length: 120)]
    private string $fullName;

    #[ORM\Column(length: 30, nullable: true)]
    private ?string $phone;

    #[ORM\Column(length: 255)]
    private string $line1;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $line2;

    #[ORM\Column(length: 20)]
    private string $postalCode;

    #[ORM\Column(length: 100)]
    private string $city;

    #[ORM\Column(length: 2)]
    private string $country;

    /** Copier une adresse du carnet dans la commande, et l'y figer. */
    public static function copyOf(Order $order, AddressRole $role, Address $address, string $fullName, ?string $phone = null): self
    {
        $copy = new self();
        $copy->id = Uuid::v7();
        $copy->order = $order;
        $copy->role = $role;
        $copy->fullName = $fullName;
        $copy->phone = $phone;
        $copy->line1 = $address->getLine1();
        $copy->line2 = $address->getLine2();
        $copy->postalCode = $address->getPostalCode();
        $copy->city = $address->getCity();
        $copy->country = $address->getCountry();
        $order->freezeAddress($copy);

        return $copy;
    }

    private function __construct()
    {
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getOrder(): Order
    {
        return $this->order;
    }

    public function getRole(): AddressRole
    {
        return $this->role;
    }

    public function getFullName(): string
    {
        return $this->fullName;
    }

    public function getPhone(): ?string
    {
        return $this->phone;
    }

    public function getLine1(): string
    {
        return $this->line1;
    }

    public function getLine2(): ?string
    {
        return $this->line2;
    }

    public function getPostalCode(): string
    {
        return $this->postalCode;
    }

    public function getCity(): string
    {
        return $this->city;
    }

    public function getCountry(): string
    {
        return $this->country;
    }
}
