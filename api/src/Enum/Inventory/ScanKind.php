<?php

namespace App\Enum\Inventory;

/**
 * Les quatre modes de scan retenus le 21/09.
 */
enum ScanKind: string
{
    case Barcode = 'BARCODE';

    case QrCode = 'QRCODE';

    /** Reconnaissance d'image. */
    case Photo = 'PHOTO';

    /** Lecture de l'étiquette textile. */
    case LabelOcr = 'LABEL_OCR';
}
