<?php

namespace App\Service\Moderation;

use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Sale\Listing;
use App\Entity\Sharing\Collection;
use App\Entity\Sharing\Comment;
use App\Entity\Sharing\Post;
use App\Enum\Notification\ModerationTargetType as T;
use App\Enum\Sale\ListingStatus;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Ce qu'on peut signaler, et ce que la modération en fait : retrouver la
 * cible d'un signalement (référence souple), son auteur, un libellé, et la
 * masquer quand c'est possible.
 *
 * Masquer : un commentaire est masqué (réversible), une publication
 * supprimée (suppression douce), une annonce retirée. Un profil, un objet,
 * un vêtement, une collection sont privés par défaut : rien à masquer, on
 * avertit ou on suspend l'auteur.
 */
final class ReportTargets
{
    /** Les onglets de la maquette : objets, contenus, commentaires. */
    public const GROUPS = [
        'objects' => [T::Item, T::Garment, T::Listing, T::Collection],
        'contents' => [T::Post, T::Profile],
        'comments' => [T::Comment],
    ];

    private const CLASSES = [
        'PROFILE' => Profile::class,
        'ITEM' => Item::class,
        'GARMENT' => Garment::class,
        'COMMENT' => Comment::class,
        'LISTING' => Listing::class,
        'COLLECTION' => Collection::class,
        'POST' => Post::class,
    ];

    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public function find(T $type, string $id): ?object
    {
        $class = self::CLASSES[$type->value] ?? null;

        return null === $class ? null : $this->em->find($class, $id);
    }

    /** Le profil responsable du contenu : celui qu'on avertit ou qu'on suspend. */
    public static function authorOf(object $target): ?Profile
    {
        return match (true) {
            $target instanceof Profile => $target,
            $target instanceof Item, $target instanceof Garment, $target instanceof Collection => $target->getOwner(),
            $target instanceof Comment, $target instanceof Post => $target->getAuthor(),
            $target instanceof Listing => $target->getSeller(),
            default => null,
        };
    }

    /** Ce que l'administrateur lit du contenu signalé. */
    public static function labelOf(object $target): string
    {
        return match (true) {
            $target instanceof Profile => $target->getDisplayName().' (@'.$target->getUsername().')',
            $target instanceof Item, $target instanceof Garment => $target->getName(),
            $target instanceof Collection => $target->getName(),
            $target instanceof Comment => $target->getBody(),
            $target instanceof Post => $target->getBody() ?? 'Publication sans texte',
            $target instanceof Listing => 'Annonce « '.$target->getPossession()->getName().' »',
            default => '',
        };
    }

    public static function canHide(object $target): bool
    {
        return match (true) {
            $target instanceof Comment => null === $target->getHiddenAt() && null === $target->getDeletedAt(),
            $target instanceof Post => null === $target->getDeletedAt(),
            $target instanceof Listing => \in_array($target->getStatus(), [ListingStatus::Draft, ListingStatus::Published], true),
            default => false,
        };
    }

    /** Masque (commentaire), supprime (publication) ou retire (annonce). */
    public static function hide(object $target): void
    {
        match (true) {
            $target instanceof Comment => $target->hide(),
            $target instanceof Post => $target->softDelete(),
            $target instanceof Listing => $target->withdraw(),
            default => throw new \DomainException('Ce contenu ne se masque pas : avertis ou suspends son auteur.'),
        };
    }

    /** Ce que « Masquer » veut dire pour cette cible, dans le formulaire. */
    public static function hideLabel(T $type): string
    {
        return match ($type) {
            T::Comment => 'Masquer le commentaire',
            T::Post => 'Retirer la publication',
            T::Listing => 'Retirer l’annonce',
            default => 'Masquer',
        };
    }
}
