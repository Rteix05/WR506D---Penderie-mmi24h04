<?php

namespace App\Enum\Sharing;

/**
 * Ce qu'un partage ouvre. Borné par l'audience : FOLLOWERS et LINK
 * n'ont que VIEW (CHECK en base).
 */
enum AccessLevel: string
{
    /** La ressource seule. */
    case View = 'VIEW';

    /** La ressource et ses commentaires, en lecture. */
    case ViewComments = 'VIEW_COMMENTS';

    /** Et l'écriture de commentaires. */
    case Comment = 'COMMENT';

    public function allowsReadingComments(): bool
    {
        return self::View !== $this;
    }

    public function allowsWritingComments(): bool
    {
        return self::Comment === $this;
    }
}
