<?php

namespace App\Security;

use App\Entity\Dressing\Outfit;
use App\Entity\Dressing\OutfitGarment;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\AbstractPossession;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Place\Box;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Relation\Follow;
use App\Entity\Sharing\BoxShare;
use App\Entity\Sharing\Collection;
use App\Entity\Sharing\CollectionEntry;
use App\Entity\Sharing\CollectionShare;
use App\Entity\Sharing\GarmentShare;
use App\Entity\Sharing\ItemShare;
use App\Entity\Sharing\OutfitShare;
use App\Entity\Sharing\PlaceShare;
use App\Entity\Sharing\RoomShare;
use App\Entity\Sharing\Share;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use App\Repository\Relation\FriendshipRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Qui voit quoi (décision du 30/09). Le seul endroit qui répond.
 *
 *  1. Tout est PRIVÉ par défaut.
 *  2. Le propriétaire et son tuteur voient et modifient tout.
 *  3. Un objet PERSONNEL n'est jamais visible par personne d'autre — même
 *     si sa pièce, son logement, un look ou un moodboard qui le contient
 *     est partagé.
 *  4. Sinon, on voit une ressource grâce à un partage ACTIF de la ressource
 *     elle-même ou de ce qui la contient : conteneur, pièce, logement ; et
 *     pour un objet ou un vêtement, un moodboard ou un look qui le montre.
 *  5. Un partage ne s'applique à un profil que selon son audience, vérifiée
 *     AU MOMENT DE LA LECTURE, par rapport à celui qui a partagé :
 *       SPECIFIC  : destinataire nommé ET toujours ami ;
 *       FRIENDS   : toujours ami ;
 *       FOLLOWERS : toujours abonné ;
 *       LINK      : jamais par un profil — seulement par le jeton du lien.
 *     Retirer quelqu'un de ses amis lui retire donc immédiatement l'accès.
 *  6. Le propriétaire d'un logement voit ce qu'on a rangé chez lui (un
 *     carton déposé par un proche), sauf s'il est personnel.
 */
final class ResourceAccess
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly FriendshipRepository $friendships,
    ) {
    }

    public function isOwner(Profile $viewer, object $resource): bool
    {
        $owner = self::ownerOf($resource);

        return null !== $owner && (
            $owner->getId()->equals($viewer->getId())
            || (null !== $owner->getGuardian() && $owner->getGuardian()->getId()->equals($viewer->getId()))
        );
    }

    public function canRead(Profile $viewer, object $resource): bool
    {
        if ($this->isOwner($viewer, $resource)) {
            return true;
        }
        if ($resource instanceof AbstractPossession && $resource->isPersonal()) {
            return false;
        }
        if ($resource instanceof AbstractPossession && $this->isOwner($viewer, $resource->getRoom())) {
            return true;
        }
        foreach ($this->sharesCovering($resource) as $share) {
            if ($this->appliesTo($share, $viewer)) {
                return true;
            }
        }

        return false;
    }

    /** Lire ET commenter : il faut un partage à une audience d'amis. */
    public function canComment(Profile $viewer, object $resource): bool
    {
        if ($this->isOwner($viewer, $resource)) {
            return true;
        }
        if ($resource instanceof AbstractPossession && $resource->isPersonal()) {
            return false;
        }
        foreach ($this->sharesCovering($resource) as $share) {
            if ($share->getAudience()->allowsComments() && $this->appliesTo($share, $viewer)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Le partage EDIT, sur cette ressource précise, qui autorise $viewer à
     * proposer des ajouts et des corrections. Nul s'il n'en a pas.
     */
    public function editGrant(Profile $viewer, object $resource): ?Share
    {
        foreach ($this->directShares($resource) as $share) {
            if (AccessLevel::Edit === $share->getAccessLevel() && $this->appliesTo($share, $viewer)) {
                return $share;
            }
        }

        return null;
    }

    /** Accès par un lien (visiteur sans compte) : lecture seule, jamais un objet personnel. */
    public function canReadWithLink(string $token, object $resource): bool
    {
        if ($resource instanceof AbstractPossession && $resource->isPersonal()) {
            return false;
        }
        foreach ($this->sharesCovering($resource) as $share) {
            if (ShareAudience::Link === $share->getAudience() && $share->isActive() && hash_equals((string) $share->getToken(), $token)) {
                return true;
            }
        }

        return false;
    }

    public function appliesTo(Share $share, Profile $viewer): bool
    {
        if (!$share->isActive()) {
            return false;
        }
        $sharer = $share->getSharedBy();

        return match ($share->getAudience()) {
            ShareAudience::Specific => $share->isRecipient($viewer) && $this->friendships->areFriends($sharer, $viewer),
            ShareAudience::Friends => $this->friendships->areFriends($sharer, $viewer),
            ShareAudience::Followers => null !== $this->em->getRepository(Follow::class)->findOneBy(['follower' => $viewer, 'following' => $sharer]),
            ShareAudience::Link => false,
        };
    }

    /** @return list<Share> les partages actifs de la ressource elle-même */
    private function directShares(object $resource): array
    {
        [$class, $field] = match (true) {
            $resource instanceof Item => [ItemShare::class, 'item'],
            $resource instanceof Garment => [GarmentShare::class, 'garment'],
            $resource instanceof Box => [BoxShare::class, 'box'],
            $resource instanceof Room => [RoomShare::class, 'room'],
            $resource instanceof Place => [PlaceShare::class, 'place'],
            $resource instanceof Outfit => [OutfitShare::class, 'outfit'],
            $resource instanceof Collection => [CollectionShare::class, 'collection'],
            default => [null, null],
        };

        return null === $class ? [] : $this->active($class, $field, $resource);
    }

    /** @return list<Share> les partages actifs de la ressource ET de tout ce qui la contient ou la montre */
    private function sharesCovering(object $resource): array
    {
        $shares = $this->directShares($resource);

        if ($resource instanceof AbstractPossession || $resource instanceof Box) {
            if (null !== ($box = $resource instanceof Box ? null : $resource->getBox())) {
                $shares = [...$shares, ...$this->active(BoxShare::class, 'box', $box)];
            }
            $shares = [...$shares, ...$this->active(RoomShare::class, 'room', $resource->getRoom())];
            $shares = [...$shares, ...$this->active(PlaceShare::class, 'place', $resource->getRoom()->getPlace())];
        }
        if ($resource instanceof Room) {
            $shares = [...$shares, ...$this->active(PlaceShare::class, 'place', $resource->getPlace())];
        }
        if ($resource instanceof AbstractPossession) {
            // Un moodboard partagé qui le montre.
            $shares = [...$shares, ...$this->em->createQueryBuilder()
                ->select('s')->from(CollectionShare::class, 's')
                ->join(CollectionEntry::class, 'e', 'WITH', 'e.collection = s.collection')
                ->where($resource instanceof Item ? 'e.item = :r' : 'e.garment = :r')
                ->andWhere('s.revokedAt IS NULL')
                ->setParameter('r', $resource->getId(), 'uuid')
                ->getQuery()->getResult()];
        }
        if ($resource instanceof Garment) {
            // Un look partagé qui le porte.
            $shares = [...$shares, ...$this->em->createQueryBuilder()
                ->select('s')->from(OutfitShare::class, 's')
                ->join(OutfitGarment::class, 'og', 'WITH', 'og.outfit = s.outfit')
                ->where('og.garment = :r')
                ->andWhere('s.revokedAt IS NULL')
                ->setParameter('r', $resource->getId(), 'uuid')
                ->getQuery()->getResult()];
        }

        return $shares;
    }

    /** @return list<Share> */
    private function active(string $shareClass, string $field, object $target): array
    {
        return $this->em->createQueryBuilder()
            ->select('s')->from($shareClass, 's')
            ->where("s.$field = :t")
            ->andWhere('s.revokedAt IS NULL')
            ->setParameter('t', $target->getId(), 'uuid')
            ->getQuery()->getResult();
    }

    public static function ownerOf(object $resource): ?Profile
    {
        return match (true) {
            $resource instanceof AbstractPossession, $resource instanceof Place, $resource instanceof Outfit, $resource instanceof Collection => $resource->getOwner(),
            $resource instanceof Room => $resource->getPlace()->getOwner(),
            $resource instanceof Box => $resource->getRoom()->getPlace()->getOwner(),
            default => null,
        };
    }
}
