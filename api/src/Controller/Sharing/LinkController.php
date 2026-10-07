<?php

namespace App\Controller\Sharing;

use App\Entity\Dressing\Outfit;
use App\Entity\Inventory\AbstractPossession;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Place\Box;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Place\Storage;
use App\Entity\Sharing\Share;
use App\Enum\Sharing\ShareAudience;
use App\Service\Sharing\ShareTargets;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Ouvrir un lien de partage, SANS compte (situation 3 de la séance 8).
 *
 * Un lien est un « porteur » : quiconque le présente voit la même chose,
 * en lecture seule, sans commentaires, jamais un objet personnel ni un
 * champ privé (notes, emplacement précis, valeur, adresse), ni les
 * affaires d'un coloc rangées dans la pièce partagée. Un lien
 * révoqué ou expiré ne montre plus rien, à personne.
 */
final class LinkController extends AbstractController
{
    #[Route('/api/links/{token}', name: 'api_link_open', methods: ['GET'])]
    public function __invoke(string $token, EntityManagerInterface $em, ShareTargets $targets): JsonResponse
    {
        $share = $em->getRepository(Share::class)->findOneBy(['token' => $token, 'audience' => ShareAudience::Link]);
        if (null === $share || !$share->isActive()) {
            // Même réponse pour un lien inconnu, révoqué ou expiré : rien à apprendre.
            throw $this->createNotFoundException('Lien introuvable ou expiré.');
        }
        $share->recordView();
        $em->flush();

        $target = $targets->targetOf($share);
        $possessions = match (true) {
            $target instanceof AbstractPossession => [$target],
            $target instanceof Box => $this->possessionsWhere($em, 'box', $target),
            $target instanceof Storage => $this->possessionsWhere($em, 'storage', $target),
            $target instanceof Room => $this->possessionsWhere($em, 'room', $target),
            $target instanceof Place => $this->possessionsIn($em, $target),
            $target instanceof Outfit => $target->getGarments(),
            default => [],
        };

        return $this->json([
            'sharedBy' => $share->getSharedBy()->getDisplayName(),
            'owner' => $share->getOwner()->getDisplayName(),
            'type' => $targets->typeOf($share),
            'name' => method_exists($target, 'getName') ? $target->getName() : null,
            'items' => array_values(array_map(static fn (AbstractPossession $p) => [
                'name' => $p->getName(),
                'description' => $p->getDescription(),
                'condition' => $p->getCondition()?->value,
            ], array_filter($possessions, static fn (AbstractPossession $p) => !$p->isPersonal() && !$p->isDeleted() && self::sharedBy($share, $p)))),
        ]);
    }

    /** Un partage de lieu ne montre que les affaires de son propriétaire (et de ses enfants), jamais celles d'un coloc. */
    private static function sharedBy(Share $share, AbstractPossession $p): bool
    {
        $owner = $p->getOwner();

        return $owner->getId()->equals($share->getOwner()->getId())
            || (null !== $owner->getGuardian() && $owner->getGuardian()->getId()->equals($share->getOwner()->getId()));
    }

    /** @return list<AbstractPossession> */
    private function possessionsWhere(EntityManagerInterface $em, string $field, object $value): array
    {
        return [
            ...$em->getRepository(Item::class)->findBy([$field => $value]),
            ...$em->getRepository(Garment::class)->findBy([$field => $value]),
        ];
    }

    /** @return list<AbstractPossession> */
    private function possessionsIn(EntityManagerInterface $em, Place $place): array
    {
        $all = [];
        foreach ($place->getRooms() as $room) {
            $all = [...$all, ...$this->possessionsWhere($em, 'room', $room)];
        }

        return $all;
    }
}
