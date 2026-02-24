import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Tasks from "@/pages/Tasks";
import { createAppStore } from "@/store";
import { bootstrapWorkflowThunk, createTaskFromConsoleThunk } from "@/store/slices/workflowSlice";
import { restoreSession } from "@/store/slices/authSlice";
import { mockStore } from "@/data/api/state";
import type { MockDataSeed } from "@/data/mockData";

const seed: MockDataSeed = {
  users: [
    {
      id: "u3",
      name: "Dr. Emily Chen",
      email: "e.chen@hospital.org",
      role: "physician",
      department: "Emergency",
      active: true,
    },
    {
      id: "u1",
      name: "Maria Santos",
      email: "m.santos@hospital.org",
      role: "reception",
      department: "Emergency",
      active: true,
    },
  ],
  authCredentials: [
    { email: "e.chen@hospital.org", password: "demo123", userId: "u3" },
    { email: "m.santos@hospital.org", password: "demo123", userId: "u1" },
  ],
  definitions: [
    {
      id: "def1",
      key: "emergency_triage",
      name: "Emergency Triage",
      version: 1,
      status: "draft",
      createdBy: "System",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: "Test definition",
      lanes: ["reception", "triage_nurse", "physician", "lab", "radiology"],
      instanceCount: 0,
    },
  ],
  instances: [],
  tasks: [],
  audit: [],
};

vi.mock("@/data/mockSeedApi", () => ({
  fetchMockSeed: async () => seed,
}));

describe("Tasks form validation", () => {
  it("shows errors and blocks completion when required fields are missing", async () => {
    mockStore.initialized = false;
    const store = createAppStore();
    store.dispatch(
      restoreSession({
        id: "u3",
        name: "Dr. Emily Chen",
        email: "e.chen@hospital.org",
        role: "physician",
        department: "Emergency",
      })
    );
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
