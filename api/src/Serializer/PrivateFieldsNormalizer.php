<?php

namespace App\Serializer;

use App\Entity\Inventory\AbstractPossession;
use App\Entity\Place\Box;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Place\Storage;
use App\Security\CurrentProfile;
use App\Security\ResourceAccess;
use Symfony\Component\Serializer\Normalizer\NormalizerAwareInterface;
use Symfony\Component\Serializer\Normalizer\NormalizerAwareTrait;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;

/**
 * Ce que chacun reçoit d'une ressource dépend de qui regarde :
 *
 *  - possession:private / place:private (notes, date et valeur d'achat,
 *    provenance, indicateur « personnel » ; adresse) : le propriétaire et
 *    son tuteur SEULEMENT ;
 *  - possession:location (pièce, rangement, conteneur) : en plus, le foyer
 *    et les colocs qui voient la pièce — pas une amie, un abonné, un lien ;
 *  - « access » : la case du tableau des droits pour celui qui regarde
 *    (ADMIN, EDIT, VIEW), pour que l'application affiche les bons gestes.
 */
final class PrivateFieldsNormalizer implements NormalizerInterface, NormalizerAwareInterface
{
    use NormalizerAwareTrait;

    private const DONE = 'penderie_private_fields_done';

    public function __construct(
        private readonly CurrentProfile $current,
        private readonly ResourceAccess $access,
    ) {
    }

    public function normalize(mixed $data, ?string $format = null, array $context = []): array|string|int|float|bool|\ArrayObject|null
    {
        $context[self::DONE][spl_object_id($data)] = true;
        $viewer = $this->viewer();
        $groups = (array) ($context['groups'] ?? []);
        if (null !== $viewer && $this->access->isOwner($viewer, $data)) {
            $groups[] = $data instanceof Place ? 'place:private' : 'possession:private';
            $groups[] = 'possession:location';
        } elseif (null !== $viewer && $data instanceof AbstractPossession && $this->access->canSeeLocation($viewer, $data)) {
            $groups[] = 'possession:location';
        }
        $context['groups'] = $groups;

        $normalized = $this->normalizer->normalize($data, $format, $context);
        if (\is_array($normalized) && null !== $viewer) {
            $normalized['access'] = $this->access->level($viewer, $data)->value;
        }

        return $normalized;
    }

    public function supportsNormalization(mixed $data, ?string $format = null, array $context = []): bool
    {
        return ($data instanceof AbstractPossession || $data instanceof Place || $data instanceof Room || $data instanceof Storage || $data instanceof Box)
            && !isset($context[self::DONE][spl_object_id($data)]);
    }

    public function getSupportedTypes(?string $format): array
    {
        return [AbstractPossession::class => false, Place::class => false, Room::class => false, Storage::class => false, Box::class => false];
    }

    private function viewer(): ?\App\Entity\Identity\Profile
    {
        try {
            return $this->current->get();
        } catch (\Throwable) {
            return null; // pas de profil (lien public) : jamais les champs privés
        }
    }
}
