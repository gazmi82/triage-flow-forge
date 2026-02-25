describe("Authentication", () => {
  it("signs in as admin and shows dashboard", () => {
    cy.loginAsAdmin();
    cy.contains("Dashboard").should("be.visible");
    cy.contains("IT").should("be.visible");
  });
});
