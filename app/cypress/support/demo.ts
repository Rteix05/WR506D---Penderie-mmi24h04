/**
 * Les comptes du jeu de démonstration (api/src/DataFixtures/DemoAccounts.php),
 * chargés dans la base penderie_e2e par make e2e-api.
 */
export const DEMO_PASSWORD = 'penderie-demo-42';

export const DEMO = {
  /** Dressing rempli, un enfant (Léo), amie de Thomas, abonnée à Julie. */
  camille: 'camille@demo.penderie.fr',
  /** Ami de Camille : son look publié est dans le fil de Camille. */
  thomas: 'thomas@demo.penderie.fr',
  /** Compte vide : premier usage. */
  nouveau: 'nouveau@demo.penderie.fr',
} as const;
