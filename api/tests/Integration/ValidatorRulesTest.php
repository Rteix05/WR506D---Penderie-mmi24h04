<?php

namespace App\Tests\Integration;

use App\Entity\Identity\Account;
use App\Entity\Identity\Profile;
use App\Entity\Inventory\Garment;
use App\Entity\Inventory\Item;
use App\Entity\Place\Box;
use App\Entity\Place\Storage;
use App\Entity\Reference\GarmentCategory;
use App\Entity\Reference\SizeValue;
use App\Entity\Sale\Listing;
use App\Entity\Sale\Order;
use App\Enum\Identity\ProfileType;
use App\Enum\Sale\DeliveryMethod;
use App\Enum\Sale\PaymentMethod;
use App\Validator\Identity\ValidGuardianship;
use App\Validator\Identity\ValidGuardianshipValidator;
use App\Validator\Inventory\ValidGarmentSize;
use App\Validator\Inventory\ValidGarmentSizeValidator;
use App\Validator\Inventory\ValidLocation;
use App\Validator\Inventory\ValidLocationValidator;
use App\Validator\Place\BoxInStorageRoom;
use App\Validator\Place\BoxInStorageRoomValidator;
use App\Validator\Reference\ValidCategoryTree;
use App\Validator\Reference\ValidCategoryTreeValidator;
use App\Validator\Sale\BuyerMayPurchase;
use App\Validator\Sale\BuyerMayPurchaseValidator;
use App\Validator\Sale\SellerMaySell;
use App\Validator\Sale\SellerMaySellValidator;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\Constraints\NotNull;
use Symfony\Component\Validator\ConstraintValidatorInterface;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;
use Symfony\Component\Validator\Exception\UnexpectedValueException;

/**
 * Les validateurs maison (src/Validator) : les cas limites que les tests
 * de domaine ne traversent pas, et leurs gardes de type.
 */
final class ValidatorRulesTest extends DatabaseTestCase
{
    /** @return iterable<string, array{class-string<ConstraintValidatorInterface>, Constraint}> */
    public static function validators(): iterable
    {
        yield 'tutelle' => [ValidGuardianshipValidator::class, new ValidGuardianship()];
        yield 'taille' => [ValidGarmentSizeValidator::class, new ValidGarmentSize()];
        yield 'emplacement' => [ValidLocationValidator::class, new ValidLocation()];
        yield 'conteneur' => [BoxInStorageRoomValidator::class, new BoxInStorageRoom()];
        yield 'arbre des catégories' => [ValidCategoryTreeValidator::class, new ValidCategoryTree()];
        yield 'acheteur' => [BuyerMayPurchaseValidator::class, new BuyerMayPurchase()];
        yield 'vendeur' => [SellerMaySellValidator::class, new SellerMaySell()];
    }

    /**
     * Un validateur posé par erreur sur une autre contrainte, ou sur une
     * autre classe, échoue tout de suite au lieu de valider de travers.
     *
     * @param class-string<ConstraintValidatorInterface> $class
     */
    #[DataProvider('validators')]
    public function testGuardsRejectAForeignConstraintOrValue(string $class, Constraint $constraint): void
    {
        $validator = self::getContainer()->get($class);

        try {
            $validator->validate(new \stdClass(), new NotNull());
            self::fail('Contrainte étrangère acceptée.');
        } catch (UnexpectedTypeException) {
        }

        $this->expectException(UnexpectedValueException::class);
        $validator->validate(new \stdClass(), $constraint);
    }

    public function testGuardianshipRules(): void
    {
        $camille = $this->profile('camille');

        // À la création, un adulte n'a pas de tuteur.
        $adult = new Profile($camille->getAccount(), ProfileType::Adult, 'Max', 'Test', new \DateTimeImmutable('1990-01-01'), 'max', $camille);
        $this->assertInvalid($adult, 'Un profil adulte n\'a pas de tuteur.');

        // Un enfant n'est pas son propre tuteur.
        $leo = $this->child('leo', $camille);
        $leo->setGuardian($leo);
        $this->assertInvalid($leo, 'Un profil ne peut pas être son propre tuteur.');
    }

    public function testGarmentSizeNeedsTheScaleOfItsCategory(): void
    {
        $camille = $this->profile('camille');
        $m = $this->em->getRepository(SizeValue::class)->findOneBy(['label' => 'M']);

        // Un vêtement à compléter n'a pas d'échelle : une taille ne s'y pose pas encore.
        $sketch = Garment::sketch($camille, 'Veste trouvée');
        $this->assertValid($sketch);
        $sketch->setSize($m);
        $this->assertInvalid($sketch, 'pas d\'échelle de tailles');

        // Une catégorie personnelle sans échelle : la taille se saisit en texte.
        $capes = new GarmentCategory('Capes', $camille);
        $this->persist($capes);
        $cape = (new Garment($camille, 'Cape', $this->room($camille), $capes))->setSize($m);
        $this->assertInvalid($cape, 'pas d\'échelle de tailles');
    }

    /**
     * Le conteneur impose sa pièce et son rangement à ce qu'il contient
     * (setBox, LocationMover). Un carton déplacé sans ses affaires, ou un
     * rangement changé à la main, laisse un emplacement incohérent : refusé.
     */
    public function testBoxMustBeInTheRoomAndOnTheStorageOfThePossession(): void
    {
        $camille = $this->profile('camille');
        $chambre = $this->room($camille, 'Chambre');
        $cave = $this->room($camille, 'Cave');
        $armoire = new Storage($chambre, 'Armoire');
        $carton = new Box($chambre, 'Carton', storage: $armoire);
        $this->persist($armoire, $carton);

        $lampe = (new Item($camille, 'Lampe', $chambre))->setBox($carton);
        $this->assertValid($lampe);

        $lampe->setStorage(null);
        $this->assertInvalid($lampe, 'Ce conteneur n\'est pas posé sur ce rangement.');

        $lampe->setBox($carton);
        $carton->moveTo($cave);
        $this->assertInvalid($lampe, 'Ce conteneur se trouve dans une autre pièce.');
    }

    public function testRootCategoryHasNothingToCheck(): void
    {
        $this->assertValid(new GarmentCategory('Mes déguisements', $this->profile('camille')));
    }

    public function testAChildMayNotBuyEvenFromAFriend(): void
    {
        $seller = $this->profile('rafael');
        $leo = $this->child('leo', $this->profile('camille'));
        $item = new Item($seller, 'Vélo', $this->room($seller));
        $listing = (new Listing($item, '80.00'))->publish();
        $this->persist($item, $listing);

        $this->assertInvalid(new Order($listing, $leo, PaymentMethod::Online, DeliveryMethod::Handover), 'Ce profil n\'est pas autorisé à acheter.');
    }
}
