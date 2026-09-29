<?php

namespace App\Enum\Sale;

/**
 * L'état d'une expédition.
 */
enum ShipmentStatus: string
{
    case Shipped = 'SHIPPED';

    case InTransit = 'IN_TRANSIT';

    case Delivered = 'DELIVERED';

    case Returned = 'RETURNED';

    case Lost = 'LOST';
}
