<?php

namespace App\DataFixtures;

use App\Entity\Dressing\DailyLook;
use App\Entity\Dressing\Outfit;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Media\Media;
use App\Entity\Relation\Follow;
use App\Entity\Relation\Friendship;
use App\Entity\Sharing\Post;
use App\Entity\Sharing\PostMedia;
use App\Enum\Dressing\LookStatus;
use App\Enum\Sharing\ShareAudience;
use App\Service\Media\MediaStorage;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

/**
 * Relations et fil de démonstration.
 *
 *  - Camille et Thomas sont amis (amitié acceptée).
 *  - Camille suit Julie (abonnement, sans amitié).
 *  - Thomas a publié pour ses amis le look du jour : deux points sur la
 *    photo, chacun confirmé sur un de ses vêtements. Même enchaînement que
 *    POST /api/looks/{id}/publish (FeedController::publishLook) : la
 *    publication met en avant une tenue (Outfit) qui reprend les vêtements
 *    du look, et porte la photo.
 *
 * La photo est copiée dans MEDIA_DIR par le même service que les envois de
 * l'app (MediaStorage) : GET /api/media/{id} la sert comme une vraie.
 */
final class SocialFixtures extends Fixture implements DependentFixtureInterface
{
    private const LOOK_PHOTO = __DIR__.'/../../fixtures/look-thomas.png';

    public function __construct(private readonly MediaStorage $storage)
    {
    }

    public function getDependencies(): array
    {
        return [DressingFixtures::class];
    }

    public function load(ObjectManager $manager): void
    {
        $camille = $this->getReference('profile-camille', Profile::class);
        $thomas = $this->getReference('profile-thomas', Profile::class);
        $julie = $this->getReference('profile-julie', Profile::class);

        $manager->persist((new Friendship($camille, $thomas))->accept());
        $manager->persist(new Follow($camille, $julie));

        $bytes = (string) file_get_contents(self::LOOK_PHOTO);
        $photo = (new Media($thomas, $this->storage->store($bytes, 'image/png'), 'image/png', \strlen($bytes)))
            ->setDimensions(1200, 1200)
            ->setAltText('Thomas, chemise en jean et chino beige');
        $manager->persist($photo);

        $look = new DailyLook($thomas, $photo, new \DateTimeImmutable('yesterday'));
        $look->setCaption('Tenue du jour pour le bureau.');
        $look->addTag(0.5, 0.35)->confirm($this->getReference('garment-thomas-chemise', Garment::class));
        $look->addTag(0.5, 0.75)->confirm($this->getReference('garment-thomas-jean', Garment::class));
        $look->moveTo(LookStatus::Ready);
        $manager->persist($look);

        $outfit = new Outfit($thomas, 'Look du '.$look->getWornOn()->format('d/m/Y'));
        foreach ($look->getGarments() as $garment) {
            $outfit->addGarment($garment);
        }
        $post = new Post($thomas, $look->getCaption(), ShareAudience::Friends, true, $outfit);
        $look->publishIn($post);
        $manager->persist($outfit);
        $manager->persist($post);
        $manager->persist(new PostMedia($post, $photo));

        $manager->flush();
    }
}
