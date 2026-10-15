import { DEMO } from '../support/demo';

/** Le fil : ce que les amis ont choisi de montrer, et rien d'autre. */
describe('Fil d\'actualité', () => {
  it('montre à Camille le look publié par son ami Thomas', () => {
    cy.login(DEMO.camille);
    cy.visit('/fil');
    cy.testId('feed-title').should('be.visible');
    cy.contains('[data-testid="post-card"]', 'Tenue du jour pour le bureau.').should('be.visible').within(() => {
      // La photo passe par GET /api/media/{id}, avec le jeton : elle s'affiche vraiment.
      cy.get('img').should(($images) => {
        expect([...$images].some((img) => (img as HTMLImageElement).naturalWidth > 0)).to.equal(true);
      });
    });
    cy.capture('fil-look-de-thomas');
  });

  it('reste vide pour un compte sans ami', () => {
    cy.login(DEMO.nouveau);
    cy.visit('/fil');
    cy.testId('feed-title').should('be.visible');
    cy.testId('post-card').should('not.exist');
  });
});
