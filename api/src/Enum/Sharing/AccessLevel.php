<?php

namespace App\Enum\Sharing;

/**
 * Ce qu'un partage ouvre (décision du 30/09). L'absence de partage vaut
 * « Rien » : tout est privé par défaut. Échelle hiérarchique : qui peut
 * modifier peut toujours lire, pas l'inverse.
 *
 *  - READ : voir. Commenter aussi, mais seulement pour une audience d'amis
 *    (SPECIFIC ou FRIENDS) : abonnés et lien restent en lecture seule.
 *  - EDIT : proposer des ajouts et des corrections, validés par le
 *    propriétaire (Contribution), et repartager en lecture. Jamais
 *    supprimer, prêter ni vendre. Donné seulement à des personnes nommées
 *    (audience SPECIFIC, CHECK en base).
 */
enum AccessLevel: string
{
    case Read = 'READ';

    case Edit = 'EDIT';

    /** Ce niveau couvre-t-il $other ? EDIT couvre READ, pas l'inverse. */
    public function includes(self $other): bool
    {
        return self::Edit === $this || $other === $this;
    }
}
