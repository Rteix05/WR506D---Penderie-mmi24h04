<?php

namespace App\Command;

use App\Entity\Identity\Account;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Inventory\Scan;
use App\Entity\Loan\Loan;
use App\Entity\Notification\Report;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Reference\GarmentCategory;
use App\Entity\Reference\ItemCategory;
use App\Entity\Sale\Listing;
use App\Entity\Sale\Order;
use App\Entity\Sale\Payment;
use App\Enum\Identity\ProfileType;
use App\Enum\Inventory\Condition;
use App\Enum\Inventory\ScanKind;
use App\Enum\Inventory\ScanStatus;
use App\Enum\Notification\ModerationTargetType;
use App\Enum\Notification\ReportReason;
use App\Enum\Place\PlaceType;
use App\Enum\Place\RoomType;
use App\Enum\Sale\DeliveryMethod;
use App\Enum\Sale\DisputeReason;
use App\Enum\Sale\PaymentDirection;
use App\Enum\Sale\PaymentMethod;
use App\Enum\Sale\PaymentStatus;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Remplit la base de développement avec de l'activité à modérer, pour voir
 * le back-office vivant : comptes inscrits ces deux dernières semaines,
 * objets et vêtements ajoutés, scans (réussis, partiels, ratés), prêts en
 * cours (dont en retard), ventes, litiges et signalements à tous les stades.
 *
 * Tout passe par les méthodes métier des entités (Loan::offer, Order,
 * openDispute, Report::takeInCharge…), comme dans l'app : seules les dates
 * sont reculées, pour que les tendances du tableau de bord aient un passé.
 *
 * Les comptes sont en @demo-bo.penderie.fr, avec un mot de passe aléatoire
 * (personne ne s'y connecte). Ajout seulement, jamais de purge ; refusé en
 * production et si le jeu est déjà chargé.
 */
#[AsCommand(
    name: 'app:demo:back-office',
    description: 'Charge un jeu d\'activité de démonstration pour le back-office (dev uniquement).',
)]
final class LoadBackOfficeDemoCommand extends Command
{
    private const DOMAIN = '@demo-bo.penderie.fr';

    /** Prénom, nom, inscrit il y a N jours, vu il y a N jours. */
    private const PEOPLE = [
        ['Inès', 'Moreau', 1, 0],
        ['Hugo', 'Lefèvre', 3, 0],
        ['Léa', 'Garnier', 5, 1],
        ['Malik', 'Benali', 8, 2],
        ['Sarah', 'Roux', 10, 4],
        ['Yanis', 'Fontaine', 12, 6],
        ['Chloé', 'Mercier', 18, 40],
        ['Noah', 'Girard', 25, 45],
    ];

    private const GARMENTS = ['Veste en jean', 'Pull en laine', 'Robe d\'été', 'Baskets blanches', 'Manteau long', 'Chemise en lin', 'Jean brut', 'Sweat à capuche'];
    private const ITEMS = ['Perceuse', 'Appareil photo', 'Tente 2 places', 'Raclette', 'Enceinte Bluetooth', 'Livre de cuisine', 'Vélo pliant', 'Machine à coudre', 'Console de jeux', 'Projecteur'];

    private \DateTimeImmutable $now;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $hasher,
        #[Autowire('%kernel.environment%')]
        private readonly string $environment,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        if ('prod' === $this->environment) {
            $io->error('Jeu de démonstration : jamais en production.');

            return Command::FAILURE;
        }
        if (null !== $this->em->getRepository(Account::class)->findOneBy(['email' => 'ines.moreau'.self::DOMAIN])) {
            $io->warning('Le jeu de démonstration est déjà chargé.');

            return Command::SUCCESS;
        }
        $admin = $this->admin();
        if (null === $admin) {
            $io->error('Aucun compte administrateur : lance d\'abord app:admin:grant <e-mail>.');

            return Command::FAILURE;
        }
        $garmentCategories = $this->em->getRepository(GarmentCategory::class)->findAll();
        $itemCategories = $this->em->getRepository(ItemCategory::class)->findAll();
        if ([] === $garmentCategories) {
            $io->error('Référentiels vides : lance d\'abord app:reference-data:load.');

            return Command::FAILURE;
        }

        mt_srand(506);
        $this->now = new \DateTimeImmutable();
        // Tout ou rien : une règle métier qui refuse une étape ne laisse pas un jeu à moitié chargé.
        $connection = $this->em->getConnection();
        $connection->beginTransaction();
        try {
            $summary = $this->seed($admin, $garmentCategories, $itemCategories);
            $connection->commit();
        } catch (\Throwable $e) {
            $connection->rollBack();
            throw $e;
        }
        $io->success($summary);

        return Command::SUCCESS;
    }

    /**
     * @param list<GarmentCategory> $garmentCategories
     * @param list<ItemCategory>    $itemCategories
     */
    private function seed(Account $admin, array $garmentCategories, array $itemCategories): string
    {

        // --- Comptes, logement, inventaire -----------------------------------------
        $people = [];
        $possessions = [];
        foreach (self::PEOPLE as $i => [$first, $last, $joined, $seen]) {
            $slug = $this->slug($first).'.'.$this->slug($last);
            $account = new Account($slug.self::DOMAIN);
            $account->setPassword($this->hasher->hashPassword($account, bin2hex(random_bytes(16))));
            $this->set($account, 'createdAt', $this->ago($joined, 9 + $i));
            $this->set($account, 'lastSeenAt', $this->ago($seen, 18));
            $profile = (new Profile($account, ProfileType::Adult, $first, $last, new \DateTimeImmutable(\sprintf('%d-0%d-1%d', 1990 + $i, 1 + $i % 9, $i)), str_replace('.', '_', $slug)))
                ->setIsDefault(true);
            $this->set($profile, 'createdAt', $this->ago($joined, 9 + $i));
            $place = new Place($profile, 'Chez '.$first, 0 === $i % 3 ? PlaceType::House : PlaceType::Apartment);
            $room = new Room($place, 'Chambre', RoomType::Bedroom);
            $this->em->persist($account);
            $this->em->persist($profile);
            $this->em->persist($place);
            $this->em->persist($room);
            $people[] = $profile;

            // 3 à 5 ajouts par personne, étalés sur les jours qui suivent l'inscription.
            $count = 3 + $i % 3;
            for ($n = 0; $n < $count; ++$n) {
                $daysAgo = max(0, $joined - $n * 2 - mt_rand(0, 1));
                $possession = 0 === $n % 2
                    ? new Garment($profile, self::GARMENTS[($i + $n) % \count(self::GARMENTS)], $room, $garmentCategories[mt_rand(0, \count($garmentCategories) - 1)])
                    : new Item($profile, self::ITEMS[($i * 2 + $n) % \count(self::ITEMS)], $room, [] === $itemCategories ? null : $itemCategories[mt_rand(0, \count($itemCategories) - 1)]);
                $possession->setCondition([Condition::New, Condition::Excellent, Condition::Good][mt_rand(0, 2)]);
                $this->set($possession, 'createdAt', $this->ago($daysAgo, 10 + $n));
                $this->em->persist($possession);
                $possessions[$i][] = $possession;
            }
        }

        // --- Scans : ~85 % réussis ce mois-ci, ~70 % le mois d'avant ---------------
        $scans = 0;
        foreach ([[0, 29, 85, 34], [30, 59, 70, 20]] as [$from, $to, $successRate, $total]) {
            for ($n = 0; $n < $total; ++$n) {
                $roll = mt_rand(1, 100);
                $status = $roll <= $successRate ? ScanStatus::Success : ($roll <= $successRate + 8 ? ScanStatus::Partial : ScanStatus::Failed);
                $kind = [ScanKind::Barcode, ScanKind::Photo, ScanKind::LabelOcr, ScanKind::QrCode][mt_rand(0, 3)];
                $scan = new Scan($people[mt_rand(0, \count($people) - 1)], $kind, $status, ScanKind::Barcode === $kind ? (string) mt_rand(3000000000000, 3999999999999) : null, null, ScanKind::Barcode === $kind ? null : 'openrouter');
                $this->set($scan, 'createdAt', $this->ago(mt_rand($from, $to), mt_rand(8, 22)));
                $this->em->persist($scan);
                ++$scans;
            }
        }
        // Deux échecs cette semaine, pour la ligne « échecs des 7 derniers jours ».
        foreach ([1, 3] as $daysAgo) {
            $scan = new Scan($people[0], ScanKind::Photo, ScanStatus::Failed, null, null, 'openrouter');
            $this->set($scan, 'createdAt', $this->ago($daysAgo, 20));
            $this->em->persist($scan);
            ++$scans;
        }

        // --- Prêts : en cours (dont 2 en retard), un rendu, une demande en attente ---
        // [prêteur, objet, emprunteur, remis il y a N jours, retour prévu dans N jours (négatif = retard)]
        $loanPlan = [[0, 1, 1, 2, 12], [1, 1, 2, 6, 8], [2, 0, 3, 20, -5], [3, 1, 4, 35, -12], [4, 0, 5, 3, 25], [5, 1, 0, 40, 10]];
        $loans = 0;
        foreach ($loanPlan as [$lender, $index, $borrower, $receivedAgo, $dueIn]) {
            $loan = Loan::offer($possessions[$lender][$index], $people[$borrower], $this->now->modify(\sprintf('%+d days', $dueIn))->setTime(0, 0), 'Prêt de démonstration');
            $loan->markReceived($people[$borrower]);
            $this->set($loan, 'requestedAt', $this->ago($receivedAgo + 1, 12));
            $this->set($loan, 'acceptedAt', $this->ago($receivedAgo + 1, 13));
            $this->set($loan, 'receivedAt', $this->ago($receivedAgo, 18));
            $this->em->persist($loan);
            ++$loans;
        }
        // Le dernier est rendu (fin du prêt du mois dernier).
        $loan->declareReturn($people[0]);
        $loan->confirmReturn($people[5], Condition::Good);
        $request = Loan::request($possessions[6][1], $people[7], 'Je peux te l\'emprunter ce week-end ?');
        $this->em->persist($request);
        ++$loans;

        // --- Ventes et litiges ------------------------------------------------------
        $sale = function (int $seller, int $index, int $buyer, string $price, PaymentMethod $pay, DeliveryMethod $delivery, int $daysAgo) use ($possessions, $people): Order {
            $listing = (new Listing($possessions[$seller][$index], $price))->publish();
            $order = new Order($listing, $people[$buyer], $pay, $delivery, DeliveryMethod::Shipping === $delivery ? '4.90' : '0.00');
            $this->set($listing, 'createdAt', $this->ago($daysAgo + 2, 11));
            $this->set($order, 'createdAt', $this->ago($daysAgo, 15));
            $this->em->persist($listing);
            $this->em->persist($order);
            if (PaymentMethod::Online === $pay) {
                $payment = (new Payment($order, PaymentDirection::Charge, 'stripe', 'pi_demo_'.bin2hex(random_bytes(6)), $order->getTotalAmount()))
                    ->updateFromProvider(PaymentStatus::Captured);
                $this->set($payment, 'createdAt', $this->ago($daysAgo, 15));
                $this->em->persist($payment);
                $order->recordPaymentCaptured();
            }

            return $order;
        };
        $jacket = $sale(0, 0, 3, '35.00', PaymentMethod::Online, DeliveryMethod::Shipping, 9);
        $jacket->ship($people[0], 'Colissimo', '6A'.mt_rand(10000000, 99999999));
        $jacket->openDispute($people[3], DisputeReason::NotReceived, 'Le suivi indique « livré » depuis 4 jours mais je n\'ai rien reçu, ni dans ma boîte aux lettres ni chez le gardien.');

        $coat = $sale(1, 2, 4, '120.00', PaymentMethod::Online, DeliveryMethod::Shipping, 14);
        $coat->ship($people[1], 'Mondial Relay', 'MR'.mt_rand(1000000, 9999999));
        $coat->recordDelivered();
        $coat->confirmReceipt($people[4]);
        $coat->openDispute($people[4], DisputeReason::NotAsDescribed, 'L\'annonce disait « comme neuf », mais il y a un accroc sur la manche et la doublure est décousue.')
            ->takeInCharge($admin);

        $dress = $sale(2, 2, 5, '18.00', PaymentMethod::Cash, DeliveryMethod::Handover, 6);
        $dress->confirmHandoverBySeller($people[2]);
        $dress->confirmHandoverByBuyer($people[5]);
        $dress->openDispute($people[5], DisputeReason::Damaged, 'Tache sur le devant que je n\'avais pas vue au moment de la remise.')
            ->resolve($admin, 'Arrangement trouvé entre les deux : 5 € rendus en main propre.');

        $pull = $sale(3, 2, 0, '22.00', PaymentMethod::Online, DeliveryMethod::Handover, 2);
        $pull->scheduleHandover($people[3], 'Samedi 14 h devant la gare.');
        $sale(4, 2, 1, '15.00', PaymentMethod::Cash, DeliveryMethod::Handover, 1);

        $this->em->flush();

        // Dates des litiges : après la commande (créés au flush, donc à reculer après coup).
        foreach ([[$jacket, 3], [$coat, 7], [$dress, 4]] as [$order, $daysAgo]) {
            $dispute = $order->getDispute();
            \assert(null !== $dispute);
            $this->set($dispute, 'createdAt', $this->ago($daysAgo, 19));
        }

        // --- Signalements : à traiter, en cours, traités ---------------------------
        $reports = [
            [0, ModerationTargetType::Garment, $possessions[6][0]->getId(), ReportReason::Counterfeit, 'Les étiquettes ressemblent à une contrefaçon, le logo n\'est pas le bon.', 1, null],
            [2, ModerationTargetType::Profile, $people[7]->getId(), ReportReason::Harassment, 'M\'envoie des demandes de prêt en boucle après mon refus.', 2, null],
            [5, ModerationTargetType::Item, $possessions[4][1]->getId(), ReportReason::Inappropriate, 'Photo sans rapport avec l\'objet.', 0, null],
            [1, ModerationTargetType::Listing, $jacket->getListing()->getId(), ReportReason::Spam, null, 5, 'review'],
            [3, ModerationTargetType::Garment, $possessions[1][0]->getId(), ReportReason::Other, 'Nom de l\'objet insultant.', 9, 'actioned'],
            [4, ModerationTargetType::Profile, $people[6]->getId(), ReportReason::Spam, 'Bio avec un lien publicitaire.', 12, 'dismissed'],
        ];
        foreach ($reports as [$reporter, $type, $targetId, $reason, $description, $daysAgo, $state]) {
            $report = new Report($people[$reporter], $type, $targetId, $reason, $description);
            $this->set($report, 'createdAt', $this->ago($daysAgo, 16));
            match ($state) {
                'review' => $report->takeInCharge($admin),
                'actioned' => $report->markActioned($admin, 'Nom modifié par la modération.'),
                'dismissed' => $report->dismiss($admin, 'Lien vers une boutique personnelle, autorisé.'),
                default => null,
            };
            $this->em->persist($report);
        }

        $this->em->flush();

        return \sprintf(
            '%d comptes, %d objets et vêtements, %d scans, %d prêts, 5 ventes (3 litiges), %d signalements.',
            \count($people), array_sum(array_map('count', $possessions)), $scans, $loans, \count($reports),
        );
    }

    private function admin(): ?Account
    {
        foreach ($this->em->getRepository(Account::class)->findAll() as $account) {
            if ($account->isAdmin()) {
                return $account;
            }
        }

        return null;
    }

    /** Il y a N jours, à H heures. */
    private function ago(int $days, int $hour): \DateTimeImmutable
    {
        return $this->now->modify(\sprintf('-%d days', $days))->setTime($hour, mt_rand(0, 59));
    }

    /** Recule une date gérée par l'entité (createdAt, receivedAt…), sans setter public. */
    private function set(object $entity, string $field, \DateTimeImmutable $value): void
    {
        $this->em->getClassMetadata($entity::class)->setFieldValue($entity, $field, $value);
    }

    private function slug(string $name): string
    {
        return strtolower((string) iconv('UTF-8', 'ASCII//TRANSLIT', $name));
    }
}
