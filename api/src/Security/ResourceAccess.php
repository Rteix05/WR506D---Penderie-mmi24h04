<?php

namespace App\Security;

use App\Entity\Dressing\Outfit;
use App\Entity\Dressing\OutfitGarment;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\AbstractPossession;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Loan\Loan;
use App\Entity\Place\Box;
use App\Entity\Place\Place;
use App\Entity\Place\PlaceMember;
use App\Entity\Place\Room;
use App\Entity\Place\Storage;
use App\Entity\Reference\AbstractCategory;
use App\Entity\Relation\Follow;
use App\Entity\Sale\Listing;
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
use App\Entity\Sharing\StorageShare;
use App\Enum\Sale\ListingAudience;
use App\Enum\Sale\ListingStatus;
use App\Enum\Sharing\Access;
use App\Enum\Sharing\AccessLevel;
use App\Enum\Sharing\ShareAudience;
use App\Repository\Relation\FriendshipRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Qui voit quoi, qui modifie quoi. Le seul endroit qui répond : le tableau
 * des droits (docs/PENDERIE_DROITS_v2.xlsx, décisions du 30/09) en code.
 *
 * Les colonnes du tableau, dans l'ordre où elles sont testées :
 *
 *  PROPRIÉTAIRE (et son tuteur) : ADMIN. Pour un logement : chacun de ses
 *    membres. Pour une pièce, un rangement, un conteneur : le créateur de
 *    la pièce, s'il habite toujours le logement.
 *  COLOC (membre du même logement) : voit et modifie DIRECTEMENT les
 *    pièces communes et leurs rangements, voit ce qui y est rangé, jamais
 *    une pièce fermée (sauf si son créateur l'y autorise). Voit aussi les
 *    looks publiés, prêts et ventes de ses colocs. Ne touche jamais aux
 *    objets des autres.
 *  PROFILS DU MÊME COMPTE (le foyer) : voient tout (sauf le personnel).
 *    Un adulte PROPOSE sur les objets, pièces, rangements et catégories ;
 *    un mineur sur les rangements et catégories.
 *  AMIS / ABONNÉS : seulement ce qui leur est PARTAGÉ (privé par défaut) ;
 *    l'audience est vérifiée AU MOMENT DE LA LECTURE (retirer un ami coupe
 *    l'accès tout de suite). « Abonnés » inclut les amis. Les amis voient
 *    aussi les prêts ; les ventes selon l'audience de l'annonce.
 *  PUBLIC : un lien ouvert (sans compte), jamais un objet personnel.
 *
 * Et partout : un objet PERSONNEL n'est visible que par son propriétaire ;
 * un partage de logement, de pièce, de rangement ou de conteneur ne
 * montre que les affaires de CELUI QUI PARTAGE (en colocation, jamais
 * celles des colocs).
 */
final class ResourceAccess
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly FriendshipRepository $friendships,
    ) {
    }

    /** La case du tableau pour ce profil et cette ressource. */
    public function level(Profile $viewer, object $resource): Access
    {
        return match (true) {
            $this->isOwner($viewer, $resource) => Access::Admin,
            $this->canManage($viewer, $resource), $this->canPropose($viewer, $resource) => Access::Edit,
            $this->canRead($viewer, $resource) => Access::View,
            default => Access::Denied,
        };
    }

    /** ADMIN : tout faire, y compris supprimer, prêter, vendre, partager. */
    public function isOwner(Profile $viewer, object $resource): bool
    {
        if ($resource instanceof Place) {
            foreach ($resource->getMemberProfiles() as $member) {
                if ($this->isSelfOrWard($viewer, $member)) {
                    return true;
                }
            }

            return false;
        }
        $room = self::roomOf($resource);
        if (null !== $room && !($resource instanceof AbstractPossession) && !$room->isCreatorPresent()) {
            return false; // son créateur a quitté la colocation : la pièce n'est plus à personne
        }
        $owner = self::ownerOf($resource);

        return null !== $owner && $this->isSelfOrWard($viewer, $owner);
    }

    /**
     * Modifier DIRECTEMENT : le propriétaire ; en colocation, tout membre
     * sur une pièce commune (ou fermée mais qui l'autorise), ses rangements
     * et ses conteneurs — jamais sur les objets des autres.
     */
    public function canManage(Profile $viewer, object $resource): bool
    {
        if ($this->isOwner($viewer, $resource)) {
            return true;
        }
        if ($resource instanceof Room || $resource instanceof Storage || $resource instanceof Box) {
            return $this->memberHasRoom($viewer, self::roomOf($resource));
        }

        return false;
    }

    /** PROPOSER une modification (le propriétaire valide) : un partage EDIT, ou le foyer. */
    public function canPropose(Profile $viewer, object $resource): bool
    {
        return null !== $this->editGrant($viewer, $resource) || $this->householdMayPropose($viewer, $resource);
    }

    public function canRead(Profile $viewer, object $resource): bool
    {
        if ($this->isOwner($viewer, $resource)) {
            return true;
        }
        $possession = self::possessionOf($resource);
        if ($resource instanceof Loan && ($this->isSelfOrWard($viewer, $resource->getBorrower()))) {
            return true; // on voit toujours un prêt auquel on participe
        }
        if (null !== $possession && $possession->isPersonal()) {
            return false;
        }
        if ($resource instanceof AbstractCategory && null === $resource->getOwner()) {
            return true; // les catégories de l'application
        }
        if ($this->isHousehold($viewer, self::ownerOf($resource))) {
            return true;
        }

        return match (true) {
            $resource instanceof Loan => $this->memberHasRoom($viewer, $possession->getRoom())
                || $this->friendships->areFriends($resource->getLender(), $viewer),
            $resource instanceof Listing => $this->canReadListing($viewer, $resource),
            $resource instanceof AbstractCategory => false,
            default => $this->memberSees($viewer, $resource) || $this->sharedWith($viewer, $resource),
        };
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

    /** Voir OÙ est rangé un objet (pièce, rangement, conteneur) : le propriétaire, le foyer, les colocs qui voient la pièce. */
    public function canSeeLocation(Profile $viewer, AbstractPossession $possession): bool
    {
        return $this->isOwner($viewer, $possession)
            || $this->isHousehold($viewer, $possession->getOwner())
            || $this->memberHasRoom($viewer, $possession->getRoom());
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

    /**
     * Le foyer (autres profils du même compte) : un adulte propose sur les
     * objets, pièces, rangements, conteneurs et catégories ; un mineur sur
     * les rangements, conteneurs et catégories. Jamais sur le personnel.
     */
    public function householdMayPropose(Profile $viewer, object $resource): bool
    {
        if (!$this->isHousehold($viewer, self::ownerOf($resource))) {
            return false;
        }
        if ($resource instanceof AbstractPossession && $resource->isPersonal()) {
            return false;
        }

        return $viewer->isOfAge()
            ? $resource instanceof AbstractPossession || $resource instanceof Room || $resource instanceof Storage || $resource instanceof Box || $resource instanceof AbstractCategory
            : $resource instanceof Storage || $resource instanceof Box || $resource instanceof AbstractCategory;
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
            ShareAudience::Followers => $this->follows($viewer, $sharer) || $this->friendships->areFriends($sharer, $viewer),
            ShareAudience::Link => false,
        };
    }

    /** Deux profils du même compte, l'un n'étant pas l'autre (le tuteur est déjà propriétaire). */
    public function isHousehold(Profile $viewer, ?Profile $owner): bool
    {
        return null !== $owner
            && !$viewer->isGhost() && !$owner->isGhost()
            && !$viewer->getId()->equals($owner->getId())
            && $viewer->getAccount()->getId()->equals($owner->getAccount()->getId());
    }

    /** Deux profils membres d'un même logement. */
    public function areFlatmates(Profile $a, Profile $b): bool
    {
        if ($a->getId()->equals($b->getId())) {
            return false;
        }

        return (int) $this->em->createQueryBuilder()
            ->select('COUNT(m1.id)')->from(PlaceMember::class, 'm1')
            ->join(PlaceMember::class, 'm2', 'WITH', 'm2.place = m1.place')
            ->where('m1.profile = :a')->andWhere('m2.profile = :b')
            ->setParameter('a', $a->getId(), 'uuid')->setParameter('b', $b->getId(), 'uuid')
            ->getQuery()->getSingleScalarResult() > 0;
    }

    /**
     * Un membre du logement a accès à cette pièce : commune, ou fermée mais
     * c'est la sienne, ou son créateur l'y autorise.
     */
    public function memberHasRoom(Profile $viewer, ?Room $room): bool
    {
        if (null === $room || !$room->getPlace()->hasMember($viewer)) {
            return false;
        }

        return !$room->isClosed()
            || $room->getCreatedBy()->getId()->equals($viewer->getId())
            || $room->isAllowed($viewer);
    }

    /** Ce que la colocation montre : la pièce et ce qu'elle contient ; les looks publiés d'un coloc. */
    private function memberSees(Profile $viewer, object $resource): bool
    {
        if (null !== ($room = self::roomOf($resource)) && $this->memberHasRoom($viewer, $room)) {
            return true;
        }
        if ($resource instanceof Outfit) {
            return $this->areFlatmates($viewer, $resource->getOwner()) && $this->isPublished($resource);
        }
        if ($resource instanceof Garment && $this->areFlatmates($viewer, $resource->getOwner())) {
            foreach ($this->em->getRepository(OutfitGarment::class)->findBy(['garment' => $resource]) as $og) {
                if ($this->isPublished($og->getOutfit())) {
                    return true;
                }
            }
        }

        return false;
    }

    private function isPublished(Outfit $outfit): bool
    {
        return [] !== $this->active(OutfitShare::class, 'outfit', $outfit);
    }

    private function sharedWith(Profile $viewer, object $resource): bool
    {
        foreach ($this->sharesCovering($resource) as $share) {
            if ($this->appliesTo($share, $viewer)) {
                return true;
            }
        }

        return false;
    }

    /** Une annonce publiée : les colocs qui voient l'objet, les amis, et les abonnés si elle leur est ouverte. */
    private function canReadListing(Profile $viewer, Listing $listing): bool
    {
        if (!\in_array($listing->getStatus(), [ListingStatus::Published, ListingStatus::Reserved], true)) {
            return false;
        }
        $seller = $listing->getSeller();

        return $this->memberHasRoom($viewer, $listing->getPossession()->getRoom())
            || $this->friendships->areFriends($seller, $viewer)
            || (ListingAudience::FriendsAndFollowers === $listing->getAudience() && $this->follows($viewer, $seller));
    }

    private function follows(Profile $follower, Profile $followed): bool
    {
        return null !== $this->em->getRepository(Follow::class)->findOneBy(['follower' => $follower, 'following' => $followed]);
    }

    private function isSelfOrWard(Profile $viewer, Profile $owner): bool
    {
        return $owner->getId()->equals($viewer->getId())
            || (null !== $owner->getGuardian() && $owner->getGuardian()->getId()->equals($viewer->getId()));
    }

    /** Un partage montre les affaires de son propriétaire (et des enfants dont il est le tuteur), pas celles des autres. */
    private function covers(Share $share, Profile $owner): bool
    {
        return $this->isSelfOrWard($share->getOwner(), $owner);
    }

    /** @return list<Share> les partages actifs de la ressource elle-même */
    private function directShares(object $resource): array
    {
        [$class, $field] = match (true) {
            $resource instanceof Item => [ItemShare::class, 'item'],
            $resource instanceof Garment => [GarmentShare::class, 'garment'],
            $resource instanceof Box => [BoxShare::class, 'box'],
            $resource instanceof Storage => [StorageShare::class, 'storage'],
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

        // Ce qui la contient : conteneur, rangement, pièce, logement — seulement pour les affaires de celui qui partage.
        $room = self::roomOf($resource);
        if (null !== $room && !($resource instanceof Room)) {
            $owner = self::ownerOf($resource);
            $containers = [];
            if ($resource instanceof AbstractPossession && null !== $resource->getBox()) {
                $containers = [...$containers, ...$this->active(BoxShare::class, 'box', $resource->getBox())];
            }
            $storage = match (true) {
                $resource instanceof AbstractPossession => $resource->getStorage(),
                $resource instanceof Box => $resource->getStorage(),
                default => null,
            };
            if (null !== $storage) {
                $containers = [...$containers, ...$this->active(StorageShare::class, 'storage', $storage)];
            }
            $containers = [...$containers, ...$this->active(RoomShare::class, 'room', $room)];
            $containers = [...$containers, ...$this->active(PlaceShare::class, 'place', $room->getPlace())];
            $shares = [...$shares, ...array_filter($containers, fn (Share $s) => $this->covers($s, $owner))];
        }
        if ($resource instanceof Room) {
            $shares = [...$shares, ...array_filter(
                $this->active(PlaceShare::class, 'place', $resource->getPlace()),
                fn (Share $s) => $this->covers($s, $resource->getCreatedBy()),
            )];
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
            $resource instanceof AbstractPossession, $resource instanceof Place, $resource instanceof Outfit,
            $resource instanceof Collection, $resource instanceof Room, $resource instanceof Storage,
            $resource instanceof Box, $resource instanceof AbstractCategory => $resource->getOwner(),
            $resource instanceof Loan => $resource->getLender(),
            $resource instanceof Listing => $resource->getSeller(),
            default => null,
        };
    }

    /** La pièce où se trouve la ressource (elle-même pour une pièce). */
    private static function roomOf(object $resource): ?Room
    {
        return match (true) {
            $resource instanceof Room => $resource,
            $resource instanceof Storage, $resource instanceof Box, $resource instanceof AbstractPossession => $resource->getRoom(),
            default => null,
        };
    }

    private static function possessionOf(object $resource): ?AbstractPossession
    {
        return match (true) {
            $resource instanceof AbstractPossession => $resource,
            $resource instanceof Loan, $resource instanceof Listing => $resource->getPossession(),
            default => null,
        };
    }
}
