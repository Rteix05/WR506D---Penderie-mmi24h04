/** Créer un compte : chaque campagne en crée un nouveau (adresse unique). */
describe('Inscription', () => {
  it('crée un compte et arrive sur un accueil vide', () => {
    const id = Date.now().toString(36);
    cy.visit('/inscription');
    cy.field('Prénom').type('Inès');
    cy.field('Nom').type('Testeuse');
    cy.field('Identifiant').type(`ines.${id}`);
    cy.field('Date de naissance').type('14/02/1999');
    cy.field('Adresse e-mail').type(`ines.${id}@demo.penderie.fr`);
    cy.field('Mot de passe').type('un-mot-de-passe-solide');
    cy.button('CRÉER MON COMPTE').scrollIntoView().click();

    cy.contains(/bonjour inès/i).should('be.visible');
    cy.get('[aria-label="Inventaire, 0 objet"]').should('be.visible');
  });

  it('refuse un mot de passe trop court', () => {
    cy.visit('/inscription');
    cy.field('Prénom').type('Inès');
    cy.field('Nom').type('Testeuse');
    cy.field('Identifiant').type('ines.court');
    cy.field('Date de naissance').type('14/02/1999');
    cy.field('Adresse e-mail').type('ines.court@demo.penderie.fr');
    cy.field('Mot de passe').type('court');
    cy.button('CRÉER MON COMPTE').scrollIntoView().click();

    cy.contains('10 caractères').should('be.visible');
    cy.location('pathname').should('eq', '/inscription');
  });
});
