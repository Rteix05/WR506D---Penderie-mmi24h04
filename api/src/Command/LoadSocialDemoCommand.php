<?php

namespace App\Command;

use App\Entity\Identity\Account;
use App\Entity\Identity\Profile;
use App\Entity\Notification\Notification;
use App\Entity\Relation\Follow;
use App\Entity\Relation\Friendship;
use App\Entity\Sharing\Post;
use App\Entity\Sharing\PostComment;
use App\Entity\Sharing\PostLike;
use App\Enum\Notification\NotificationType;
use App\Enum\Relation\FriendshipStatus;
use App\Enum\Sharing\ShareAudience;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Des « j'aime » et des commentaires de démonstration sur la dernière
 * publication d'un profil, pour voir le fil vivre (développement seulement).
 *
 *   php bin/console app:demo:social scantest
 *
 * Les profils de démo (thomas.demo, camille.demo, julie.demo et les comptes
 * @demo-bo.penderie.fr) deviennent amis ou abonnés du profil s'ils ne le
 * sont pas. Une publication pour les abonnés n'accepte pas de commentaires
 * (règle du MDD) : elle passe alors aux amis, et le partage qu'elle porte
 * aussi. Relancer la commande ne double rien.
 */
#[AsCommand(name: 'app:demo:social', description: 'Ajoute des « j\'aime » et des commentaires de démo sur la dernière publication d\'un profil (dev).')]
final class LoadSocialDemoCommand extends Command
{
    private const FRIENDS = ['camille.demo', 'thomas.demo', 'julie.demo'];

    /** [qui (index dans les amis), texte, réponse de l'auteur ?] */
    private const COMMENTS = [
        [0, 'Trop bien ce look, ça te va super bien !', null],
        [1, 'Tu me la prêtes samedi ?', 'Si tu me la rends dimanche, oui 😉'],
        [2, 'Les couleurs vont parfaitement ensemble.', null],
        [0, 'C\'est de quelle marque, les chaussures ?', 'Des baskets que j\'ai depuis deux ans, toujours au top.'],
    ];

    public function __construct(
        private readonly EntityManagerInterface $em,
        #[Autowire('%kernel.environment%')]
        private readonly string $environment,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addArgument('username', InputArgument::REQUIRED, 'L\'identifiant du profil dont on anime la dernière publication');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        if ('prod' === $this->environment) {
            $io->error('Données de démo : jamais en production.');

            return Command::FAILURE;
        }

        $author = $this->em->getRepository(Profile::class)->findOneBy(['username' => $input->getArgument('username')]);
        if (null === $author) {
            $io->error('Profil introuvable.');

            return Command::FAILURE;
        }
        $post = $this->em->getRepository(Post::class)->findOneBy(['author' => $author, 'deletedAt' => null], ['publishedAt' => 'DESC']);
        if (null === $post) {
            $io->error('Ce profil n\'a encore rien publié.');

            return Command::FAILURE;
        }

        $friends = $this->friends($author);
        $followers = $this->followers($author, $friends);
        if ([] === $friends) {
            $io->error('Aucun profil de démo pour commenter (thomas.demo, camille.demo, julie.demo).');

            return Command::FAILURE;
        }
        $this->em->flush();

        // Les commentaires demandent une publication pour les amis (jamais les abonnés).
        if (ShareAudience::Followers === $post->getAudience()) {
            $conn = $this->em->getConnection();
            $conn->executeStatement("UPDATE post SET audience = 'FRIENDS', comments_enabled = true WHERE id = :id", ['id' => (string) $post->getId()]);
            if (null !== $post->getShare()) {
                $conn->executeStatement("UPDATE share SET audience = 'FRIENDS' WHERE id = :id", ['id' => (string) $post->getShare()->getId()]);
            }
            $this->em->clear();
            $post = $this->em->find(Post::class, $post->getId()) ?? throw new \LogicException('Publication perdue.');
            $author = $post->getAuthor();
            $friends = array_map(fn (Profile $p) => $this->em->find(Profile::class, $p->getId()), $friends);
            $followers = array_map(fn (Profile $p) => $this->em->find(Profile::class, $p->getId()), $followers);
            $io->note('La publication était pour les abonnés : elle passe aux amis, pour accepter des commentaires.');
        }

        $likes = 0;
        $start = $post->getPublishedAt();
        foreach (array_values(array_filter([...$friends, ...$followers])) as $i => $profile) {
            if (null === $this->em->find(PostLike::class, ['post' => $post, 'profile' => $profile])) {
                $this->em->persist(new PostLike($post, $profile, $start->modify(\sprintf('+%d minutes', 3 + 7 * $i))));
                ++$likes;
            }
        }

        $comments = 0;
        if (0 === $this->em->getRepository(PostComment::class)->count(['post' => $post])) {
            $minute = 5;
            foreach (self::COMMENTS as [$who, $text, $reply]) {
                $friend = $friends[$who % \count($friends)];
                \assert($friend instanceof Profile);
                $comment = $this->comment($friend, $post, $text, null, $start->modify("+$minute minutes"));
                $this->em->persist(new Notification($author, NotificationType::CommentAdded, $friend->getDisplayName().' a commenté ta publication', $text, ['post' => (string) $post->getId()], $friend));
                ++$comments;
                $minute += 11;
                if (null !== $reply) {
                    $this->comment($author, $post, $reply, $comment, $start->modify("+$minute minutes"));
                    ++$comments;
                    $minute += 6;
                }
            }
        }
        $this->em->flush();

        $io->success(\sprintf('« %s » : %d j\'aime et %d commentaires ajoutés (%d amis de démo).', mb_substr((string) $post->getBody(), 0, 40), $likes, $comments, \count($friends) + \count($followers)));

        return Command::SUCCESS;
    }

    private function comment(Profile $author, Post $post, string $text, ?PostComment $parent, \DateTimeImmutable $at): PostComment
    {
        $comment = new PostComment($author, $post, $text, $parent);
        $this->em->persist($comment);
        // Daté comme s'il avait été écrit après la publication (le trait d'horodatage ne remplace pas une date posée).
        $this->em->getClassMetadata(PostComment::class)->setFieldValue($comment, 'createdAt', $at);

        return $comment;
    }

    /**
     * Les amis de démo du profil (créés acceptés s'ils ne le sont pas).
     *
     * @return list<Profile>
     */
    private function friends(Profile $author): array
    {
        $friends = [];
        foreach (self::FRIENDS as $username) {
            $friend = $this->em->getRepository(Profile::class)->findOneBy(['username' => $username]);
            if (null === $friend || $friend->getId()->equals($author->getId())) {
                continue;
            }
            $link = $this->em->getRepository(Friendship::class)->findOneBy(['requester' => $friend, 'addressee' => $author])
                ?? $this->em->getRepository(Friendship::class)->findOneBy(['requester' => $author, 'addressee' => $friend]);
            if (null === $link) {
                $link = new Friendship($friend, $author);
                $this->em->persist($link);
            }
            if (FriendshipStatus::Pending === $link->getStatus()) {
                $link->accept();
            }
            if (FriendshipStatus::Accepted === $link->getStatus()) {
                $friends[] = $friend;
            }
        }

        return $friends;
    }

    /**
     * Les comptes de démo du back-office : amis eux aussi (une publication
     * pour les amis n'est pas visible des abonnés, qui ne pourraient donc
     * pas l'aimer), et ils suivent le profil.
     *
     * @param list<Profile> $friends
     *
     * @return list<Profile>
     */
    private function followers(Profile $author, array $friends): array
    {
        $profiles = $this->em->createQueryBuilder()
            ->select('p')->from(Profile::class, 'p')->join('p.account', 'a')
            ->where('a.email LIKE :demo')->andWhere('a.id != :ghost')
            ->setParameter('demo', '%@demo-bo.penderie.fr')->setParameter('ghost', Account::GHOST_ID)
            ->setMaxResults(5)->getQuery()->getResult();
        $more = [];
        foreach ($profiles as $profile) {
            if ($profile->getId()->equals($author->getId()) || \in_array($profile, $friends, true)) {
                continue;
            }
            $link = $this->em->getRepository(Friendship::class)->findOneBy(['requester' => $profile, 'addressee' => $author])
                ?? $this->em->getRepository(Friendship::class)->findOneBy(['requester' => $author, 'addressee' => $profile]);
            if (null === $link) {
                $link = new Friendship($profile, $author);
                $this->em->persist($link);
            }
            if (FriendshipStatus::Pending === $link->getStatus()) {
                $link->accept();
            }
            if (null === $this->em->getRepository(Follow::class)->findOneBy(['follower' => $profile, 'following' => $author])) {
                $this->em->persist(new Follow($profile, $author));
            }
            if (FriendshipStatus::Accepted === $link->getStatus()) {
                $more[] = $profile;
            }
        }

        return $more;
    }
}
