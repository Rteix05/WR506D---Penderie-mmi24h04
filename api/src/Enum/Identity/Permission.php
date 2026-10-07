<?php

namespace App\Enum\Identity;

/**
 * Les permissions d'un profil, et la politique par défaut de chaque type.
 *
 * La matrice vit ici, en code, et pas en base (décision du 18/09) :
 * ProfilePermission ne stocke que les écarts réglés par le tuteur.
 */
enum Permission: string
{
    case ItemCreate = 'ITEM_CREATE';
    case GarmentManage = 'GARMENT_MANAGE';
    case CollectionCreate = 'COLLECTION_CREATE';
    case MediaUpload = 'MEDIA_UPLOAD';
    case LoanBorrow = 'LOAN_BORROW';
    case LoanLend = 'LOAN_LEND';
    case ShareCreate = 'SHARE_CREATE';
    case FriendAdd = 'FRIEND_ADD';
    case CommentWrite = 'COMMENT_WRITE';
    case Follow = 'FOLLOW';
    case Purchase = 'PURCHASE';
    case Sell = 'SELL';

    /**
     * Un profil enfant range, gère ses vêtements et compose ses collections
     * seul ; les interactions sortantes passent par le tuteur ; l'argent et
     * l'abonnement sont fermés. ADULT et RELATIVE n'ont aucune restriction.
     */
    public function defaultModeFor(ProfileType $type): PermissionMode
    {
        if (ProfileType::Child !== $type) {
            return PermissionMode::Allowed;
        }

        return match ($this) {
            self::ItemCreate,
            self::GarmentManage,
            self::CollectionCreate,
            self::MediaUpload => PermissionMode::Allowed,

            self::LoanBorrow,
            self::LoanLend,
            self::ShareCreate,
            self::FriendAdd,
            self::CommentWrite => PermissionMode::RequiresApproval,

            self::Follow,
            self::Purchase,
            self::Sell => PermissionMode::Denied,
        };
    }
}
