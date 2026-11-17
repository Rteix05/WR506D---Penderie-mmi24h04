<?php

namespace App\Enum\Moderation;

/**
 * Ce qu'est devenue une pré-analyse de l'IA (AiReview).
 */
enum AiReviewStatus: string
{
    /** Aucun modèle n'a répondu, ou la réponse ne respectait pas le format : rien n'est proposé. */
    case Failed = 'FAILED';

    /** Confiance suffisante, décision réversible : l'IA l'a appliquée elle-même. */
    case Applied = 'APPLIED';

    /** En dessous du seuil (ou décision réservée à un humain) : un résumé attend l'administrateur. */
    case Proposed = 'PROPOSED';

    /** L'administrateur a tranché comme l'IA le proposait. */
    case Confirmed = 'CONFIRMED';

    /** L'administrateur a tranché autrement que l'IA. */
    case Overridden = 'OVERRIDDEN';

    /** Une décision appliquée par l'IA a été annulée par un administrateur. */
    case Reverted = 'REVERTED';

    /** Encore entre les mains d'un administrateur (proposée, ou appliquée et annulable). */
    public function isOpen(): bool
    {
        return self::Proposed === $this || self::Applied === $this;
    }
}
