<?php

namespace App\Enum\Media;

enum MediaKind: string
{
    case Photo = 'PHOTO';

    /** L'image capturée pendant un scan (photo, étiquette OCR). */
    case ScanCapture = 'SCAN_CAPTURE';

    /** Une image d'inspiration posée sur un moodboard. */
    case Inspiration = 'INSPIRATION';
}
