import { DEMO } from '../support/demo';

/**
 * Un parcours qui écrit : créer un logement en quatre étapes, puis le
 * retrouver avec ses pièces. Compte vide des fixtures (Nina) ; la base e2e
 * est remise à zéro à chaque campagne (make e2e).
 */
describe('Nouveau logement', () => {
  it('crée un studio avec ses pièces proposées', () => {
    cy.login(DEMO.nouveau);
    cy.visit('/nouveau-logement/type');

    // Chaque étape a son propre bouton « Continuer » (testID distinct) : la
    // pile de navigation garde les étapes précédentes dans la page, sans
    // ambiguïté pour autant.

    // 1. Le type : un studio propose salon, cuisine et salle de bain.
    cy.testId('place-kind-studio').click().should('have.attr', 'aria-selected', 'true');
    cy.testId('place-type-next').scrollIntoView().click();

    // 2. Les informations.
    cy.testId('place-name').clear().type('Studio Croix-Rousse');
    cy.testId('place-infos-next').scrollIntoView().click();

    // 3. Les pièces, déjà cochées d'après le type.
    cy.get('[data-testid="room-chip"][aria-checked="true"]').should('have.length', 3);
    cy.testId('place-rooms-next').scrollIntoView().click();

    // 4. La vérification, puis l'enregistrement par l'API.
    cy.contains('Studio Croix-Rousse').should('be.visible');
    cy.testId('place-save').scrollIntoView().click();

    // L'écran du logement créé (les étapes, cachées, restent dans la pile).
    cy.location('pathname').should('match', /^\/logements\/[0-9a-f-]{36}$/);
    cy.get('[data-testid="room-card"]:visible').should('have.length', 3);
    for (const piece of ['Salon', 'Cuisine', 'Salle de bain']) {
      cy.contains('[data-testid="room-card"]:visible', piece).should('be.visible');
    }
    cy.capture('logement-cree');
  });
});
