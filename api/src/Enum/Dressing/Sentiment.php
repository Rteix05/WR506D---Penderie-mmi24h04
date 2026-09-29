<?php

namespace App\Enum\Dressing;

/**
 * Aimer ou ne pas aimer.
 */
enum Sentiment: string
{
    case Like = 'LIKE';

    case Dislike = 'DISLIKE';
}
