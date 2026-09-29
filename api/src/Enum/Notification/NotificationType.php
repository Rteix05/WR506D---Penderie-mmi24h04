<?php

namespace App\Enum\Notification;

/**
 * Tous les événements notifiés, dans une seule entité. Le type pilote
 * l'icône, le texte et l'écran d'arrivée. Ajouter un événement = une
 * valeur ici, un gabarit de rendu et un déclencheur.
 */
enum NotificationType: string
{
    case FollowNew = 'FOLLOW_NEW';
    case FollowMutual = 'FOLLOW_MUTUAL';
    case FriendRequest = 'FRIEND_REQUEST';
    case FriendAccepted = 'FRIEND_ACCEPTED';
    case LoanRequested = 'LOAN_REQUESTED';
    case LoanAccepted = 'LOAN_ACCEPTED';
    case LoanDueSoon = 'LOAN_DUE_SOON';
    case LoanOverdue = 'LOAN_OVERDUE';
    case LoanReturned = 'LOAN_RETURNED';
    case ItemLost = 'ITEM_LOST';
    case ListingSold = 'LISTING_SOLD';
    case OrderPaid = 'ORDER_PAID';
    case OrderShipped = 'ORDER_SHIPPED';
    case RefundIssued = 'REFUND_ISSUED';
    case CommentAdded = 'COMMENT_ADDED';
    case ShareReceived = 'SHARE_RECEIVED';
    case ApprovalRequested = 'APPROVAL_REQUESTED';
    case ApprovalDecided = 'APPROVAL_DECIDED';
    case ModerationAction = 'MODERATION_ACTION';

    /**
     * Les notifications de vente, à livrer en priorité (décision client du
     * 21/09) : la vente ne fonctionne pas sans elles.
     */
    public function isSaleCritical(): bool
    {
        return \in_array($this, [self::ListingSold, self::OrderPaid, self::OrderShipped, self::RefundIssued], true);
    }
}
