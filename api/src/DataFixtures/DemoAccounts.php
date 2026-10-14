<?php

namespace App\DataFixtures;

/**
 * Les comptes du jeu de démonstration, en un seul endroit : les fixtures
 * les créent, les tests de bout en bout (app/cypress) s'y connectent, la
 * documentation (docs/coverage.md, docs/ci.md) les cite.
 *
 * Identifiants de démonstration uniquement, sur une base jetable
 * (penderie_e2e) : jamais réutilisés ailleurs.
 */
final class DemoAccounts
{
    public const PASSWORD = 'penderie-demo-42';

    /** Le compte principal des scénarios : un dressing rempli, un enfant, un ami, un abonnement. */
    public const CAMILLE = 'camille@demo.penderie.fr';

    /** L'ami de Camille : son look publié pour ses amis apparaît dans le fil de Camille. */
    public const THOMAS = 'thomas@demo.penderie.fr';

    /** Suivie par Camille (abonnement, pas d'amitié). */
    public const JULIE = 'julie@demo.penderie.fr';

    /** Un compte vide, pour les parcours de premier usage. */
    public const NOUVEAU = 'nouveau@demo.penderie.fr';
}
