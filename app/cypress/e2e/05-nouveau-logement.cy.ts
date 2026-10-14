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

    // La pile de navigation garde les étapes précédentes dans la page : le
    // bouton de l'étape en cours est le dernier.

    // 1. Le type : un studio propose salon, cuisine et salle de bain.
    cy.contains('Studio').click();
    cy.button('Continuer').last().scrollIntoView().click();

    // 2. Les informations.
    cy.field('Nom').last().clear().type('Studio Croix-Rousse');
    cy.button('Continuer').last().scrollIntoView().click();

    // 3. Les pièces, déjà cochées d'après le type.
    cy.get('[role="checkbox"][aria-checked="true"]').should('have.length', 3);
    cy.button('Continuer').last().scrollIntoView().click();

    // 4. La vérification, puis l'enregistrement par l'API.
    cy.contains('Studio Croix-Rousse').should('be.visible');
    cy.button('Ajouter ce logement').scrollIntoView().click();

    // L'écran du logement créé (les étapes, cachées, restent dans la pile).
    cy.location('pathname').should('match', /^\/logements\/[0-9a-f-]{36}$/);
    for (const piece of ['Salon', 'Cuisine', 'Salle de bain']) {
      cy.contains('[role="button"]:visible', piece).should('be.visible');
    }
    cy.capture('logement-cree');
  });
});
