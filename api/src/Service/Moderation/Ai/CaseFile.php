<?php

namespace App\Service\Moderation\Ai;

use App\Entity\Identity\Account;
use App\Entity\Identity\Profile;
use App\Entity\Notification\ModerationAction;
use App\Entity\Notification\Report;
use App\Entity\Sale\Dispute;
use App\Entity\Sale\Order;
use App\Enum\Notification\ModerationActionType;
use App\Enum\Notification\ModerationTargetType;
use App\Enum\Notification\ReportStatus;
use App\Enum\Sale\OrderStatus;
use App\Service\Moderation\ReportTargets;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;

/**
 * Le dossier qu'on remet au modèle : tout ce qu'un administrateur
 * regarderait avant de trancher (le contenu signalé, le motif, les autres
 * signalements, l'historique de l'auteur et la fiabilité du signalant ;
 * pour un litige, la commande, sa chronologie, la livraison et le passé des
 * deux parties).
 *
 * Données minimales : pas d'e-mail, pas de nom de famille, pas d'adresse.
 * Les personnes sont désignées par leur rôle (auteur, signalant, acheteur,
 * vendeur) et leur pseudo. Le dossier est gardé tel quel dans AiReview.input.
 */
final class CaseFile
{
    /** Au-delà, un texte est coupé : un commentaire de 10 000 caractères n'apprend rien de plus. */
    private const MAX_TEXT = 2000;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ReportTargets $targets,
        private readonly ClockInterface $clock,
    ) {
    }

    /** @return array<string, mixed> */
    public function forReport(Report $report): array
    {
        $target = $this->targets->find($report->getTargetType(), (string) $report->getTargetId());
        $author = null === $target ? null : ReportTargets::authorOf($target);
        $sameTarget = $this->em->getRepository(Report::class)->findBy(['targetType' => $report->getTargetType(), 'targetId' => $report->getTargetId()]);

        return [
            'type' => 'SIGNALEMENT',
            'signalement' => [
                'motif' => $report->getReason()->value,
                'description' => self::cut($report->getDescription()),
                'date' => self::date($report->getCreatedAt()),
                'statut' => $report->getStatus()->value,
            ],
            'contenu' => [
                'type' => $report->getTargetType()->value,
                'existe' => null !== $target,
                'texte' => null === $target ? null : self::cut(ReportTargets::labelOf($target)),
                'description' => null !== $target && method_exists($target, 'getDescription') ? self::cut($target->getDescription()) : null,
                'dejaMasque' => null !== $target && method_exists($target, 'getHiddenAt') && null !== $target->getHiddenAt(),
                'masquable' => null !== $target && ReportTargets::canHide($target),
                'date' => null !== $target && method_exists($target, 'getCreatedAt') ? self::date($target->getCreatedAt()) : null,
                // Le modèle lit du texte : il ne voit ni les photos ni les images du contenu.
                'imagesVisibles' => false,
            ],
            'autresSignalementsSurCeContenu' => [
                'nombre' => \count($sameTarget) - 1,
                'signalantsDistincts' => \count(array_unique(array_map(static fn (Report $r) => (string) $r->getReporter()->getId(), $sameTarget))),
                'motifs' => array_values(array_unique(array_map(static fn (Report $r) => $r->getReason()->value, $sameTarget))),
            ],
            'auteur' => null === $author ? null : $this->person($author),
            'signalant' => $this->reporter($report->getReporter()),
        ];
    }

    /** @return array<string, mixed> */
    public function forDispute(Dispute $dispute): array
    {
        $order = $dispute->getOrder();
        $buyer = $order->getBuyer();
        $shipment = $order->getShipment();
        $role = fn (?Profile $p): string => match (true) {
            null === $p => 'SYSTEME',
            $p->getId()->equals($buyer->getId()) => 'ACHETEUR',
            $p->getId()->equals($order->getSeller()->getId()) => 'VENDEUR',
            default => 'AUTRE',
        };

        $events = [];
        foreach ($order->getEvents() as $event) {
            $events[] = [
                'date' => self::date($event->getOccurredAt()),
                'type' => $event->getType()->value,
                'par' => $role($event->getActor()),
                'note' => self::cut($event->getNote()),
            ];
        }
        usort($events, static fn (array $a, array $b) => strcmp((string) $a['date'], (string) $b['date']));

        return [
            'type' => 'LITIGE',
            'litige' => [
                'ouvertPar' => $role($dispute->getOpener()),
                'motif' => $dispute->getReason()->value,
                'description' => self::cut($dispute->getDescription()),
                'date' => self::date($dispute->getCreatedAt()),
            ],
            'commande' => [
                'reference' => $order->getReference(),
                'annonce' => self::cut($order->getListing()->getPossession()->getName()),
                'descriptionAnnonce' => self::cut($order->getListing()->getDescription()),
                'montantObjet' => $order->getItemAmount().' '.$order->getCurrency(),
                'montantTotal' => $order->getTotalAmount().' '.$order->getCurrency(),
                'paiement' => $order->getPaymentMethod()->value,
                'livraison' => $order->getDeliveryMethod()->value,
                'statut' => $order->getStatus()->value,
                'remiseConfirmeeParVendeur' => self::date($order->getHandoverConfirmedBySellerAt()),
                'remiseConfirmeeParAcheteur' => self::date($order->getHandoverConfirmedByBuyerAt()),
                'chronologie' => $events,
            ],
            'envoi' => null === $shipment ? null : [
                'transporteur' => $shipment->getCarrier(),
                'numeroDeSuivi' => null !== $shipment->getTrackingNumber(),
                'statut' => $shipment->getStatus()->value,
                'expedieLe' => self::date($shipment->getShippedAt()),
                'livreLe' => self::date($shipment->getDeliveredAt()),
            ],
            'acheteur' => $this->party($buyer, $dispute),
            'vendeur' => $this->party($order->getSeller(), $dispute),
        ];
    }

    /** @return array<string, mixed> L'auteur d'un contenu : ancienneté et passé de modération. */
    private function person(Profile $profile): array
    {
        $account = $profile->getAccount();

        return [
            'pseudo' => $profile->getUsername(),
            'enfant' => $profile->isChild(),
            'ancienneteJours' => $this->days($account->getCreatedAt()),
            'suspenduActuellement' => null !== $profile->getSuspendedAt(),
            'avertissementsPasses' => $this->actions(ModerationActionType::Warn, ModerationTargetType::Profile, $profile),
            'suspensionsPassees' => $this->actions(ModerationActionType::BanAccount, ModerationTargetType::Account, $account)
                + $this->actions(ModerationActionType::SuspendProfile, ModerationTargetType::Profile, $profile),
            'contenusMasquesOuRetires' => $this->hiddenContents($profile),
        ];
    }

    /** @return array<string, mixed> Le signalant : combien il signale, et combien de ses signalements étaient fondés. */
    private function reporter(Profile $profile): array
    {
        $repo = $this->em->getRepository(Report::class);

        return [
            'pseudo' => $profile->getUsername(),
            'ancienneteJours' => $this->days($profile->getAccount()->getCreatedAt()),
            'signalementsEnvoyes' => $repo->count(['reporter' => $profile]),
            'signalementsFondes' => $repo->count(['reporter' => $profile, 'status' => ReportStatus::Actioned]),
            'signalementsClassesSansSuite' => $repo->count(['reporter' => $profile, 'status' => ReportStatus::Dismissed]),
        ];
    }

    /** @return array<string, mixed> Une partie d'un litige : ancienneté, ventes et achats conclus, autres litiges. */
    private function party(Profile $profile, Dispute $dispute): array
    {
        $orders = $this->em->getRepository(Order::class);
        $disputes = (int) $this->em->createQueryBuilder()
            ->select('COUNT(d.id)')->from(Dispute::class, 'd')->join('d.order', 'o')
            ->where('o.buyer = :p OR o.seller = :p')->andWhere('d.id != :self')
            ->setParameter('p', $profile)->setParameter('self', $dispute->getId(), 'uuid')
            ->getQuery()->getSingleScalarResult();

        return [
            'pseudo' => $profile->getUsername(),
            'ancienneteJours' => $this->days($profile->getAccount()->getCreatedAt()),
            'ventesConclues' => $orders->count(['seller' => $profile, 'status' => OrderStatus::Completed]),
            'achatsConclus' => $orders->count(['buyer' => $profile, 'status' => OrderStatus::Completed]),
            'autresLitiges' => $disputes,
            'suspenduActuellement' => null !== $profile->getSuspendedAt(),
        ];
    }

    private function actions(ModerationActionType $type, ModerationTargetType $targetType, Profile|Account $target): int
    {
        return $this->em->getRepository(ModerationAction::class)->count(['actionType' => $type, 'targetType' => $targetType, 'targetId' => $target->getId()]);
    }

    /** Les signalements traités par une action sur un contenu de cet auteur. */
    private function hiddenContents(Profile $profile): int
    {
        $count = 0;
        $reports = $this->em->getRepository(Report::class)->findBy(['status' => ReportStatus::Actioned], ['createdAt' => 'DESC'], 200);
        foreach ($reports as $report) {
            $target = $this->targets->find($report->getTargetType(), (string) $report->getTargetId());
            if (null !== $target && !$target instanceof Profile && ReportTargets::authorOf($target)?->getId()->equals($profile->getId())) {
                ++$count;
            }
        }

        return $count;
    }

    private function days(?\DateTimeImmutable $since): ?int
    {
        return null === $since ? null : (int) $since->diff($this->clock->now())->days;
    }

    private static function date(?\DateTimeImmutable $date): ?string
    {
        return $date?->format('Y-m-d H:i');
    }

    private static function cut(?string $text): ?string
    {
        if (null === $text) {
            return null;
        }
        $text = trim($text);

        return mb_strlen($text) > self::MAX_TEXT ? mb_substr($text, 0, self::MAX_TEXT).' […]' : $text;
    }
}
