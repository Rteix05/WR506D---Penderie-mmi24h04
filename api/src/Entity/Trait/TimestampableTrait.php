<?php

namespace App\Entity\Trait;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * createdAt / updatedAt, implicites sur toutes les entités du MDD.
 *
 * L'entité qui utilise ce trait doit porter #[ORM\HasLifecycleCallbacks] :
 * Doctrine n'appelle les méthodes #[ORM\PrePersist] / #[ORM\PreUpdate] que
 * sur les classes qui le déclarent.
 *
 * Les propriétés sont non nulles, comme les colonnes, mais restent non
 * initialisées jusqu'au premier enregistrement : les getters renvoient
 * alors null (ValidGuardianship s'en sert pour reconnaître une entité
 * nouvelle).
 */
trait TimestampableTrait
{
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    #[ORM\PrePersist]
    public function initializeTimestamps(): void
    {
        $now = new \DateTimeImmutable();
        $this->createdAt ??= $now;
        $this->updatedAt = $now;
    }

    #[ORM\PreUpdate]
    public function refreshUpdatedAt(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    /** Null tant que l'entité n'a pas été enregistrée. */
    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt ?? null;
    }

    /** Null tant que l'entité n'a pas été enregistrée. */
    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt ?? null;
    }
}
