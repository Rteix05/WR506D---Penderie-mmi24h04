import { DEMO } from '../support/demo';

/** Retrouver ses affaires : le dressing, les objets, les logements. */
describe('Inventaire', () => {
  beforeEach(() => cy.login(DEMO.camille));

  it('liste le dressing de Camille', () => {
    cy.visit('/dressing');
    cy.contains('9 vêtements').should('be.visible');
    // Les fiches plus bas dans la grille : on fait défiler, comme un utilisateur.
    cy.contains('Chemise en lin blanche').scrollIntoView().should('be.visible');
    cy.contains('Blazer noir').scrollIntoView().should('be.visible');
    cy.capture('dressing-camille');
  });

  it('liste ses objets et ouvre une fiche', () => {
    cy.visit('/objets');
    cy.contains('3 objets').should('be.visible');
    cy.contains('Appareil photo argentique').scrollIntoView().click();

    cy.location('pathname').should('match', /^\/objet\//);
    cy.contains('Commode').should('be.visible');
  });

  it('montre ses logements et leurs pièces', () => {
    cy.visit('/logements');
    cy.contains('Mes logements').should('be.visible');
    cy.contains('Appartement Lyon').scrollIntoView().click();

    cy.contains('Chambre').should('be.visible');
    cy.contains('Cave').should('be.visible');
  });
});
