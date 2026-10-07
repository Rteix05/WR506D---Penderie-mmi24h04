<?php

namespace App\Enum\Sale;

/**
 * Les gestes et transitions d'une commande, journalisés dans OrderEvent.
 */
enum OrderEventType: string
{
    case Created = 'CREATED';
    case PaymentAuthorized = 'PAYMENT_AUTHORIZED';
    case PaymentCaptured = 'PAYMENT_CAPTURED';
    case PaymentFailed = 'PAYMENT_FAILED';
    case HandoverScheduled = 'HANDOVER_SCHEDULED';
    case HandoverConfirmedBySeller = 'HANDOVER_CONFIRMED_BY_SELLER';
    case HandoverConfirmedByBuyer = 'HANDOVER_CONFIRMED_BY_BUYER';
    case Shipped = 'SHIPPED';
    case Delivered = 'DELIVERED';
    case Received = 'RECEIVED';
    case Completed = 'COMPLETED';
    case Cancelled = 'CANCELLED';
    case RefundRequested = 'REFUND_REQUESTED';
    case RefundIssued = 'REFUND_ISSUED';
    case DisputeOpened = 'DISPUTE_OPENED';
}
