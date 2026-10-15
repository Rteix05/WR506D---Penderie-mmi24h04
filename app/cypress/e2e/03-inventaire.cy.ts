import { DEMO } from '../support/demo';

/** Retrouver ses affaires : le dressing, les objets, les logements. */
describe('Inventaire', () => {
  beforeEach(() => cy.login(DEMO.camille));

  it('liste le dressing de Camille', () => {
    cy.visit('/dressing');
    cy.testId('dressing-title-legend').should('contain', '9 vêtements');
    cy.testId('garment-card').should('have.length', 9);
    // Les fiches plus bas dans la grille : on fait défiler, comme un utilisateur.
    cy.contains('[data-testid="garment-card"]', 'Chemise en lin blanche').scrollIntoView().should('be.visible');
    cy.contains('[data-testid="garment-card"]', 'Blazer noir').scrollIntoView().should('be.visible');
    cy.capture('dressing-camille');
  });

  it('liste ses objets et ouvre une fiche', () => {
    cy.visit('/objets');
    cy.testId('items-title-legend').should('contain', '3 objets');
    cy.testId('item-card').should('have.length', 3);
    cy.contains('[data-testid="item-card"]', 'Appareil photo argentique').scrollIntoView().click();

    cy.location('pathname').should('match', /^\/objet\//);
    cy.contains('Commode').should('be.visible');
  });

  it('montre ses logements et leurs pièces', () => {
    cy.visit('/logements');
    cy.testId('places-title').should('be.visible');
    cy.contains('[data-testid="place-card"]', 'Appartement Lyon').scrollIntoView().click();

    cy.contains('[data-testid="room-card"]', 'Chambre').should('be.visible');
    cy.contains('[data-testid="room-card"]', 'Cave').should('be.visible');
  });
});
