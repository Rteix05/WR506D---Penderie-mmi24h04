<?php

namespace App\Tests\Admin;

use App\Entity\Identity\Account;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Item;
use App\Entity\Notification\ModerationAction;
use App\Entity\Notification\Notification;
use App\Entity\Notification\Report;
use App\Entity\Place\Place;
use App\Entity\Place\Room;
use App\Entity\Sharing\ItemComment;
use App\Enum\Identity\ProfileType;
use App\Enum\Notification\ModerationActionType;
use App\Enum\Notification\ModerationTargetType;
use App\Enum\Notification\NotificationType;
use App\Enum\Notification\ReportReason;
use App\Enum\Notification\ReportStatus;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\DomCrawler\Crawler;

/**
 * Les signalements dans le back-office : la liste par onglet et par état,
 * et chaque décision (classer, masquer, avertir, suspendre), qui écrit sa
 * ModerationAction liée au signalement et clôt celui-ci.
 */
final class ReportsTest extends WebTestCase
{
    private KernelBrowser $client;
    private EntityManagerInterface $em;
    private Account $admin;
    private Profile $author;
    private Profile $reporter;

    protected function setUp(): void
    {
        $this->client = self::createClient();
        $this->em = self::getContainer()->get(EntityManagerInterface::class);
        $this->admin = $this->profile('camille', admin: true)->getAccount();
        $this->author = $this->profile('mathis');
        $this->reporter = $this->profile('julie');
        $this->client->loginUser($this->admin, 'admin');
    }

    private function profile(string $username, bool $admin = false): Profile
    {
        $account = new Account($username.'@exemple.fr');
        if ($admin) {
            $account->setRoles([Account::ROLE_ADMIN]);
        }
        $profile = new Profile($account, ProfileType::Adult, ucfirst($username), 'Test', new \DateTimeImmutable('1990-01-01'), $username);
        $this->em->persist($account);
        $this->em->persist($profile);
        $this->em->flush();

        return $profile;
    }

    /** Un commentaire de Mathis, signalé par Julie. */
    private function reportedComment(): Report
    {
        $place = new Place($this->reporter, 'Maison');
        $room = new Room($place, 'Chambre');
        $veste = new Item($this->reporter, 'Veste en jean', $room);
        $comment = new ItemComment($this->author, $veste, 'niko mok');
        $report = new Report($this->reporter, ModerationTargetType::Comment, $comment->getId(), ReportReason::Harassment, 'Insulte');
        foreach ([$place, $room, $veste, $comment, $report] as $entity) {
            $this->em->persist($entity);
        }
        $this->em->flush();

        return $report;
    }

    private function page(string $url): Crawler
    {
        $this->em->clear();
        $crawler = $this->client->request('GET', $url);
        self::assertResponseIsSuccessful($url);

        return $crawler;
    }

    private function decide(Report $report, string $decision, string $note = 'Menace explicite'): void
    {
        $form = $this->page('/admin/signalements/'.$report->getId())->selectButton('Appliquer la décision')->form();
        $this->client->submit($form, ['decision' => $decision, 'note' => $note]);
        $this->client->followRedirect();
    }

    private function fresh(Report $report): Report
    {
        $this->em->clear();

        return $this->em->find(Report::class, $report->getId()) ?? self::fail('signalement perdu');
    }

    public function testTheListByTabAndState(): void
    {
        $this->reportedComment();
        $crawler = $this->page('/admin/signalements?group=comments');
        self::assertStringContainsString('« niko mok »', $crawler->filter('section[aria-label=Signalements] tbody')->text());
        self::assertStringContainsString('Harcèlement', $crawler->filter('tbody')->text());
        self::assertSelectorTextContains('nav[aria-label="Back-office"]', 'Signalements 1', 'la pastille du menu');
        self::assertCount(0, $this->page('/admin/signalements?group=objects')->filter('tbody tr'));
        self::assertCount(0, $this->page('/admin/signalements?group=comments&filter=handled')->filter('tbody tr'));
        self::assertStringContainsString('Commentaire signalé', $this->page('/admin')->filter('#priorites + ul')->text(), 'en tête des priorités du tableau de bord');
    }

    public function testHidingTheComment(): void
    {
        $report = $this->reportedComment();
        $this->decide($report, 'hide');

        $report = $this->fresh($report);
        self::assertSame(ReportStatus::Actioned, $report->getStatus());
        self::assertSame('Masquer le commentaire : Menace explicite', $report->getResolution());
        self::assertSame($this->admin->getEmail(), $report->getHandledBy()?->getEmail());
        $comment = $this->em->find(ItemComment::class, $report->getTargetId());
        self::assertNotNull($comment?->getHiddenAt(), 'le commentaire disparaît pour tout le monde');
        $action = $this->em->getRepository(ModerationAction::class)->findOneBy(['report' => $report]);
        self::assertSame([ModerationActionType::HideContent, ModerationTargetType::Comment], [$action?->getActionType(), $action?->getTargetType()]);
        self::assertSelectorNotExists('form[action$="/decision"]');
        self::assertStringContainsString('Traité', $this->page('/admin/signalements/'.$report->getId())->filter('#decision')->ancestors()->first()->text());
    }

    public function testWarningTheAuthor(): void
    {
        $report = $this->reportedComment();
        $this->decide($report, 'warn', 'Reste courtois');

        self::assertSame(ReportStatus::Actioned, $this->fresh($report)->getStatus());
        $warning = $this->em->getRepository(Notification::class)->findOneBy(['recipient' => $this->author->getId(), 'type' => NotificationType::ModerationAction]);
        self::assertSame(['Avertissement de la modération', 'Reste courtois'], [$warning?->getTitle(), $warning?->getBody()]);
        $comment = $this->em->find(ItemComment::class, $report->getTargetId());
        self::assertNull($comment?->getHiddenAt(), 'un avertissement ne masque rien');
    }

    public function testSuspendingTheAuthor(): void
    {
        $report = $this->reportedComment();
        $this->decide($report, 'suspend');

        self::assertSame(ReportStatus::Actioned, $this->fresh($report)->getStatus());
        self::assertNotNull($this->em->find(Profile::class, $this->author->getId())?->getSuspendedAt());
        $ban = $this->em->getRepository(ModerationAction::class)->findOneBy(['report' => $report->getId()]);
        self::assertSame(ModerationActionType::BanAccount, $ban?->getActionType());
        self::assertSame((new \DateTimeImmutable('+30 days'))->format('Y-m-d'), $ban->getExpiresAt()?->format('Y-m-d'));
    }

    public function testDismissingAndDecidingOnlyOnce(): void
    {
        $report = $this->reportedComment();
        $this->decide($report, 'dismiss', 'Second degré entre amis');
        self::assertSame(ReportStatus::Dismissed, $this->fresh($report)->getStatus());
        self::assertNull($this->em->getRepository(ModerationAction::class)->findOneBy(['report' => $report->getId()]), 'classer n\'écrit pas d\'action');

        $this->client->request('POST', '/admin/signalements/'.$report->getId().'/decision', ['decision' => 'hide', 'note' => 'x', '_token' => 'faux']);
        $this->client->followRedirect();
        self::assertSelectorTextContains('[role=alert]', 'La page a expiré');
    }

    public function testANoteIsRequired(): void
    {
        $report = $this->reportedComment();
        $this->decide($report, 'hide', '   ');
        self::assertSelectorTextContains('[role=alert]', 'La note est obligatoire');
        self::assertSame(ReportStatus::Open, $this->fresh($report)->getStatus());
    }
}
