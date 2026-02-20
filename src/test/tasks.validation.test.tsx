import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Tasks from "@/pages/Tasks";
import { createAppStore } from "@/store";
import { bootstrapWorkflowThunk, createTaskFromConsoleThunk } from "@/store/slices/workflowSlice";

describe("Tasks form validation", () => {
  it("shows errors and blocks completion when required fields are missing", async () => {
    const store = createAppStore();
    await store.dispatch(bootstrapWorkflowThunk());
    await store.dispatch(
      createTaskFromConsoleThunk({
        nodeType: "userTask",
        label: "Physician Assessment",
        assignedRole: "physician",
        createdByRole: "reception",
        patientName: "John Doe",
        patientId: "P-3821",
        registrationNote: "Chest pain",
      })
    );

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      </Provider>
    );

    const physicianTask = await screen.findByRole("button", { name: /physician assessment/i });
    fireEvent.click(physicianTask);

    const completeButton = await screen.findByRole("button", { name: /complete task/i });

    fireEvent.click(completeButton);

    const errors = screen.getAllByText("This field is required.");
    expect(errors).toHaveLength(3);
    expect(screen.getByRole("heading", { level: 1, name: "Physician Assessment" })).toBeInTheDocument();
  });
});
