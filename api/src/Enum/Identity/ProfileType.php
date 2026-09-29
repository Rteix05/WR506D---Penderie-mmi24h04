<?php

namespace App\Enum\Identity;

enum ProfileType: string
{
    /** Autonome. */
    case Adult = 'ADULT';

    /** Sous tutelle : guardian obligatoire. */
    case Child = 'CHILD';

    /** Un proche géré par le compte, majeur, sans restriction sociale. */
    case Relative = 'RELATIVE';
}
