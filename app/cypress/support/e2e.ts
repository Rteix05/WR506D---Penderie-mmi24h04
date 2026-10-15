import { DEMO_PASSWORD } from './demo';

/**
 * Commandes communes. Les écrans sont ciblés par des attributs dédiés aux
 * tests, comme le conseille le cours (data-cy) : la prop testID de React
 * Native, que react-native-web rend en data-testid. Ces sélecteurs ne
 * cassent pas quand un libellé, une traduction ou le design change.
 * L'accessibilité reste vérifiée, mais comme une assertion sur l'élément
 * trouvé (role, aria-label, aria-checked) : elle n'est plus le moyen de le
 * trouver.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Les éléments dont le testID (data-testid sur le web) vaut `id`. */
      testId(id: string): Chainable<JQuery<HTMLElement>>;
      /** Se connecte par l'écran de connexion (session gardée entre les tests). */
      login(email: string, password?: string): Chainable<void>;
      /**
       * Capture d'écran de démonstration : l'app ET le journal des commandes
       * de Cypress (cypress/screenshots/<spec>/<nom>.png, reprises dans docs/ci.md).
       */
      capture(name: string): Chainable<void>;
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

Cypress.Commands.add('testId', (id: string) => cy.get(`[data-testid="${id}"]`));

Cypress.Commands.add('login', (email: string, password: string = DEMO_PASSWORD) => {
  cy.session(
    email,
    () => {
      cy.visit('/connexion');
      cy.testId('login-email').type(email);
      cy.testId('login-password').type(password, { log: false });
      cy.testId('login-submit').click();
      cy.testId('home-greeting').should('be.visible');
    },
    {
      // La session vit dans le localStorage (expo-secure-store sur le web).
      validate: () => {
        cy.window().its('localStorage').invoke('getItem', 'penderie.token').should('not.be.null');
      },
    },
  );
});

Cypress.Commands.add('capture', (name: string) => {
  cy.screenshot(name, { capture: 'runner', overwrite: true });
});

export {};
