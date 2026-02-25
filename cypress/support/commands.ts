declare global {
  namespace Cypress {
    interface Chainable {
      loginAsAdmin(): Chainable<void>;
    }
  }
}

export {};

Cypress.Commands.add("loginAsAdmin", () => {
  cy.visit("/auth");
  cy.get('input[type="email"]').clear().type("admin@hospital.org");
  cy.get('input[type="password"]').clear().type("admin123");
  cy.get('button[type="submit"]').contains("Sign In").click();
  cy.url().should("not.include", "/auth");
  cy.contains("Dashboard").should("be.visible");
});
