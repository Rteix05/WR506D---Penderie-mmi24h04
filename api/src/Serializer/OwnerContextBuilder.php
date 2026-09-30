<?php

namespace App\Serializer;

use ApiPlatform\State\SerializerContextBuilderInterface;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Place\Place;
use App\Security\CurrentProfile;
use Symfony\Component\DependencyInjection\Attribute\AsDecorator;
use Symfony\Component\DependencyInjection\Attribute\AutowireDecorated;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Serializer\Normalizer\AbstractNormalizer;

/**
 * À la création d'un bien ou d'un logement, le propriétaire n'est JAMAIS
 * lu dans la requête : c'est le profil actif. On le fournit au
 * dénormaliseur comme argument par défaut du constructeur (owner) ; le
 * champ ne figure dans aucun groupe d'écriture, le client ne peut donc pas
 * le remplacer.
 */
#[AsDecorator('api_platform.serializer.context_builder')]
final class OwnerContextBuilder implements SerializerContextBuilderInterface
{
    private const OWNED = [Item::class, Garment::class, Place::class];

    public function __construct(
        #[AutowireDecorated] private readonly SerializerContextBuilderInterface $decorated,
        private readonly CurrentProfile $current,
    ) {
    }

    public function createFromRequest(Request $request, bool $normalization, ?array $extractedAttributes = null): array
    {
        $context = $this->decorated->createFromRequest($request, $normalization, $extractedAttributes);
        $class = $context['resource_class'] ?? null;

        if (!$normalization && \in_array($class, self::OWNED, true) && $request->isMethod('POST')) {
            $context[AbstractNormalizer::DEFAULT_CONSTRUCTOR_ARGUMENTS][$class]['owner'] = $this->current->get();
        }

        return $context;
    }
}
