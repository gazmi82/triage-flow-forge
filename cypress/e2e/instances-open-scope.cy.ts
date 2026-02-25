describe("Open instances scope", () => {
  it("navigates from dashboard active instances to open-scope instance monitor", () => {
    cy.loginAsAdmin();
    cy.contains("p.text-sm.font-semibold", "Active Instances")
      .should("be.visible")
      .parent()
      .within(() => {
        cy.get("button").contains("View all").click();
      });

    cy.url().should("include", "/instances?scope=open");
    cy.contains("Open instances inferred from non-completed tasks").should("be.visible");
  });
});
