describe("Admin user management", () => {
  it("creates a new user with assigned role", () => {
    const email = `qa.user.${Date.now()}@hospital.org`;

    cy.loginAsAdmin();
    cy.contains("a", "Admin").click();
    cy.contains("button", "Users & Roles").click();
    cy.contains("button", "Add User").click();

    cy.get("#admin-user-name").type("QA Nurse");
    cy.get("#admin-user-email").type(email);

    cy.get("#admin-user-role").click();
    cy.contains("[role='option']", "Triage Nurse").click();

    cy.get("#admin-user-department").clear().type("Emergency");
    cy.get("#admin-user-password").type("demo123");
    cy.contains("button", "Create User").click();

    cy.contains("td", "QA Nurse").should("be.visible");
    cy.contains("td", email).should("be.visible");
    cy.contains("Triage Nurse").should("be.visible");
  });
});
