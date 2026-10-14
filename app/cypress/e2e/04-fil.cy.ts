import { DEMO } from '../support/demo';

/** Le fil : ce que les amis ont choisi de montrer, et rien d'autre. */
describe('Fil d\'actualité', () => {
  it('montre à Camille le look publié par son ami Thomas', () => {
    cy.login(DEMO.camille);
    cy.visit('/fil');
    cy.contains('Fil d\'actualité').should('be.visible');
    cy.contains('Tenue du jour pour le bureau.').should('be.visible');
  });

  it('reste vide pour un compte sans ami', () => {
    cy.login(DEMO.nouveau);
    cy.visit('/fil');
    cy.contains('Fil d\'actualité').should('be.visible');
    cy.contains('Tenue du jour pour le bureau.').should('not.exist');
  });
});
