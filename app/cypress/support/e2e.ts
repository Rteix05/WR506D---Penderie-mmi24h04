import { DEMO_PASSWORD } from './demo';

/**
 * Commandes communes. Les écrans sont ciblés comme un lecteur d'écran les
 * lit : react-native-web traduit accessibilityLabel en aria-label, et
 * accessibilityRole en role. Pas d'identifiant de test ajouté au code :
 * si Cypress trouve un champ, VoiceOver le trouve aussi.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Le champ de saisie dont l'étiquette est `label`. */
      field(label: string): Chainable<JQuery<HTMLElement>>;
      /** Le bouton dont l'étiquette est `label`. */
      button(label: string): Chainable<JQuery<HTMLElement>>;
      /** Se connecte par l'écran de connexion (session gardée entre les tests). */
      login(email: string, password?: string): Chainable<void>;
    }
  }
}

/**
 * Une seule erreur de l'app est tolérée, et nommément : celle de NativeWind
 * (react-native-css-interop, runtime/web/color-scheme.js) qui, au chargement
 * de sa feuille de style sur le web, appelle colorScheme.set("system") alors
 * que le mode sombre suit le réglage du système (darkMode « media », notre
 * choix : tailwind.config.js). Sans effet visible, elle apparaît aussi dans la
 * console d'un navigateur ordinaire. Toute autre erreur fait échouer le test.
 */
Cypress.on('uncaught:exception', (error) => !error.message.includes("Cannot manually set color scheme, as dark mode is type 'media'"));

Cypress.Commands.add('field', (label: string) => cy.get(`input[aria-label="${label}"]`));

Cypress.Commands.add('button', (label: string) => cy.get(`[role="button"][aria-label="${label}"]`));

Cypress.Commands.add('login', (email: string, password: string = DEMO_PASSWORD) => {
  cy.session(
    email,
    () => {
      cy.visit('/connexion');
      cy.field('Adresse e-mail').type(email);
      cy.field('Mot de passe').type(password, { log: false });
      cy.button('SE CONNECTER').click();
      cy.contains('Inventaire').should('be.visible');
    },
    {
      // La session vit dans le localStorage (expo-secure-store sur le web).
      validate: () => {
        cy.window().its('localStorage').invoke('getItem', 'penderie.token').should('not.be.null');
      },
    },
  );
});

export {};
