<?php

namespace App\Entity\Identity;

use App\Entity\Trait\TimestampableTrait;
use App\Enum\Identity\Permission;
use App\Enum\Identity\PermissionMode;
use App\Repository\Identity\ProfilePermissionRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Uid\Uuid;

/**
 * Une exception à la politique par défaut du type de profil
 * (Permission::defaultModeFor). Aucune ligne = comportement par défaut :
 * la table ne stocke que ce que le tuteur a changé.
 *
 * Seul le tuteur du profil (ou un adulte du même compte) peut écrire ici :
 * règle portée par un voter, avec l'exposition API.
 */
#[ORM\Entity(repositoryClass: ProfilePermissionRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\UniqueConstraint(name: 'uniq_profile_permission', columns: ['profile_id', 'permission'])]
#[UniqueEntity(fields: ['profile', 'permission'], message: 'Cette permission est déjà réglée pour ce profil.')]
class ProfilePermission
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Profile::class, inversedBy: 'permissions')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Profile $profile;

    #[ORM\Column(length: 30, enumType: Permission::class)]
    private Permission $permission;

    #[ORM\Column(length: 20, enumType: PermissionMode::class)]
    private PermissionMode $mode;

    /** Qui a réglé la permission : la trace de la décision parentale. */
    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Profile $updatedBy;

    public function __construct(Profile $profile, Permission $permission, PermissionMode $mode, Profile $updatedBy)
    {
        $this->id = Uuid::v7();
        $this->profile = $profile;
        $this->permission = $permission;
        $this->mode = $mode;
        $this->updatedBy = $updatedBy;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getProfile(): Profile
    {
        return $this->profile;
    }

    public function getPermission(): Permission
    {
        return $this->permission;
    }

    public function getMode(): PermissionMode
    {
        return $this->mode;
    }

    public function changeMode(PermissionMode $mode, Profile $updatedBy): static
    {
        $this->mode = $mode;
        $this->updatedBy = $updatedBy;

        return $this;
    }

    public function getUpdatedBy(): Profile
    {
        return $this->updatedBy;
    }
}
