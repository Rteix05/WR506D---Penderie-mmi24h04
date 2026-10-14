import { defineConfig } from 'cypress';

/**
 * Tests de bout en bout de l'application, dans sa version web (Expo).
 *
 * Ils tournent contre une API à part (port 8090, base penderie_e2e remplie
 * par les fixtures de api/src/DataFixtures) : jamais contre la base de
 * développement. Tout se lance depuis la racine du dépôt : make e2e.
 *
 *   APP_E2E_URL  adresse de l'app web   (défaut http://localhost:8082)
 *   API_E2E_URL  adresse de l API e2e, donnée à l app par run-e2e.mjs (défaut :8090)
 */
export default defineConfig({
  e2e: {
    baseUrl: process.env.APP_E2E_URL ?? 'http://localhost:8082',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    // Un téléphone : l'app est pensée pour un écran mobile.
    viewportWidth: 390,
    viewportHeight: 844,
    // L'API e2e tourne en mode dev sur un montage Docker : lente sous Windows.
    defaultCommandTimeout: 30000,
    pageLoadTimeout: 120000,
    video: false,
    screenshotOnRunFailure: true,
  },
});
