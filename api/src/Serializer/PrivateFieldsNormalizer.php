<?php

namespace App\Serializer;

use App\Entity\Inventory\AbstractPossession;
use App\Entity\Place\Place;
use App\Security\CurrentProfile;
use App\Security\ResourceAccess;
use Symfony\Component\Serializer\Normalizer\NormalizerAwareInterface;
use Symfony\Component\Serializer\Normalizer\NormalizerAwareTrait;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;

/**
 * Les champs privés d'un bien ou d'un logement ne sortent que pour son
 * propriétaire (et le tuteur de celui-ci) : notes, emplacement (pièce,
 * rangement, conteneur), date et valeur d'achat, provenance, indicateur
 * « personnel » ; l'adresse d'un logement.
 *
 * Quelqu'un à qui l'objet est partagé VOIT l'objet (nom, photos, état,
 * catégorie, taille…), pas ce qui ne regarde que son propriétaire. Les
 * champs privés sont dans les groupes possession:private et
 * place:private, ajoutés ici selon celui qui regarde.
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
        if ($this->viewerOwns($data)) {
            $context['groups'] = [...(array) ($context['groups'] ?? []), $data instanceof Place ? 'place:private' : 'possession:private'];
        }

        return $this->normalizer->normalize($data, $format, $context);
    }

    public function supportsNormalization(mixed $data, ?string $format = null, array $context = []): bool
    {
        return ($data instanceof AbstractPossession || $data instanceof Place)
            && !isset($context[self::DONE][spl_object_id($data)]);
    }

    public function getSupportedTypes(?string $format): array
    {
        return [AbstractPossession::class => false, Place::class => false];
    }

    private function viewerOwns(object $data): bool
    {
        try {
            return $this->access->isOwner($this->current->get(), $data);
        } catch (\Throwable) {
            return false; // pas de profil (lien public) : jamais les champs privés
        }
    }
}
