/** Remplit le formulaire d'inscription ; `password` varie d'un scénario à l'autre. */
function fillSignup(username: string, password: string) {
  cy.testId('signup-first-name').type('Inès');
  cy.testId('signup-last-name').type('Testeuse');
  cy.testId('signup-username').type(username);
  cy.testId('signup-birth-date').type('14/02/1999');
  cy.testId('signup-email').type(`${username}@demo.penderie.fr`);
  cy.testId('signup-password').type(password);
  cy.testId('signup-submit').scrollIntoView().click();
}

/** Créer un compte : chaque campagne en crée un nouveau (adresse unique). */
describe('Inscription', () => {
  it('crée un compte et arrive sur un accueil vide', () => {
    cy.visit('/inscription');
    fillSignup(`ines.${Date.now().toString(36)}`, 'un-mot-de-passe-solide');

    cy.testId('home-greeting').should('be.visible').invoke('text').should('match', /bonjour inès/i);
    cy.testId('home-inventory').should('have.attr', 'aria-label', 'Inventaire, 0 objet');
  });

  it('refuse un mot de passe trop court', () => {
    cy.visit('/inscription');
    // Avant l'envoi, la règle est affichée comme une aide, pas comme une erreur.
    cy.testId('signup-password-hint').should('contain', '10 caractères');
    cy.testId('signup-password-error').should('not.exist');

    fillSignup('ines.court', 'court');

    // Après l'envoi : la même phrase devient l'erreur du champ (l'ancien test,
    // cy.contains('10 caractères'), passait même sans erreur, grâce à l'aide).
    cy.testId('signup-password-error').should('be.visible').and('contain', '10 caractères');
    cy.testId('signup-password-hint').should('not.exist');
    cy.location('pathname').should('eq', '/inscription');
  });
});
