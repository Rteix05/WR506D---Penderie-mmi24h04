import { DEMO } from '../support/demo';

/** Le fil : ce que les amis ont choisi de montrer, et rien d'autre. */
describe('Fil d\'actualité', () => {
  it('montre à Camille le look publié par son ami Thomas', () => {
    cy.login(DEMO.camille);
    cy.visit('/fil');
    cy.contains('Fil d\'actualité').should('be.visible');
    cy.contains('Tenue du jour pour le bureau.').should('be.visible');
    // La photo passe par GET /api/media/{id}, avec le jeton : elle s'affiche vraiment.
    cy.get('img:visible').should(($images) => {
      expect([...$images].some((img) => (img as HTMLImageElement).naturalWidth > 0)).to.equal(true);
    });
    cy.capture('fil-look-de-thomas');
  });

  it('reste vide pour un compte sans ami', () => {
    cy.login(DEMO.nouveau);
    cy.visit('/fil');
    cy.contains('Fil d\'actualité').should('be.visible');
    cy.contains('Tenue du jour pour le bureau.').should('not.exist');
  });
});
