import { DEMO, DEMO_PASSWORD } from '../support/demo';

/** Se connecter, se tromper de mot de passe, se déconnecter. */
describe('Connexion', () => {
  it('refuse un mauvais mot de passe, avec un message lisible', () => {
    cy.visit('/connexion');
    cy.testId('login-email').type(DEMO.camille);
    cy.testId('login-password').type('pas-le-bon-mot-de-passe');
    cy.testId('login-submit').click();

    // Le message est annoncé au lecteur d'écran (role alert), et l'on reste sur la connexion.
    cy.testId('login-error').should('be.visible').and('have.attr', 'role', 'alert').and('not.be.empty');
    cy.location('pathname').should('eq', '/connexion');
    cy.capture('mauvais-mot-de-passe');
  });

  it('ouvre l\'accueil avec le bon mot de passe', () => {
    cy.visit('/connexion');
    cy.testId('login-email').type(DEMO.camille);
    cy.testId('login-password').type(DEMO_PASSWORD, { log: false });
    cy.testId('login-submit').click();

    // Les aperçus de l'accueil comptent ce que les fixtures ont rangé.
    cy.testId('home-greeting').should('be.visible').invoke('text').should('match', /bonjour camille/i);
    cy.testId('home-inventory').should('be.visible').and('have.attr', 'aria-label', 'Inventaire, 3 objets');
    cy.testId('home-dressing').should('be.visible').and('have.attr', 'aria-label', 'Dressing, 9 vêtements');
    cy.capture('accueil-camille');
  });

  it('se déconnecte depuis Mon profil', () => {
    cy.login(DEMO.camille);
    cy.visit('/profil');
    cy.testId('logout').scrollIntoView().click();

    cy.testId('login-submit').should('be.visible');
  });
});
