import { DEMO, DEMO_PASSWORD } from '../support/demo';

/** Se connecter, se tromper de mot de passe, se déconnecter. */
describe('Connexion', () => {
  it('refuse un mauvais mot de passe, avec un message lisible', () => {
    cy.visit('/connexion');
    cy.field('Adresse e-mail').type(DEMO.camille);
    cy.field('Mot de passe').type('pas-le-bon-mot-de-passe');
    cy.button('SE CONNECTER').click();

    cy.get('[role="alert"]').should('be.visible');
    cy.location('pathname').should('eq', '/connexion');
  });

  it('ouvre l\'accueil avec le bon mot de passe', () => {
    cy.visit('/connexion');
    cy.field('Adresse e-mail').type(DEMO.camille);
    cy.field('Mot de passe').type(DEMO_PASSWORD, { log: false });
    cy.button('SE CONNECTER').click();

    // Les aperçus de l'accueil comptent ce que les fixtures ont rangé.
    cy.contains(/bonjour camille/i).should('be.visible');
    cy.get('[aria-label="Inventaire, 3 objets"]').should('be.visible');
    cy.get('[aria-label="Dressing, 9 vêtements"]').should('be.visible');
  });

  it('se déconnecte depuis Mon profil', () => {
    cy.login(DEMO.camille);
    cy.visit('/profil');
    cy.button('Se déconnecter').scrollIntoView().click();

    cy.button('SE CONNECTER').should('be.visible');
  });
});
