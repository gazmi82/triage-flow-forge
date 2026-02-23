import { describe, expect, it, vi } from "vitest";
import { mockApi } from "@/data/mockApi";
import { mockStore } from "@/data/api/state";
import type { MockDataSeed } from "@/data/mockData";

const seed: MockDataSeed = {
  users: [
    {
      id: "u1",
      name: "Maria Santos",
      email: "m.santos@hospital.org",
      role: "reception",
      department: "Emergency",
      active: true,
    },
  ],
  authCredentials: [{ email: "m.santos@hospital.org", password: "demo123", userId: "u1" }],
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

describe("instance graph isolation", () => {
  it("keeps each task instance on its own process path", async () => {
    // Fresh bootstrap per test run
    mockStore.initialized = false;
    await mockApi.fetchBootstrapData();

    const createA = await mockApi.createTaskFromConsole({
      nodeType: "userTask",
      label: "Registration A",
      assignedRole: "reception",
      createdByRole: "reception",
      patientName: "Patient A",
      patientId: "P-A",
    });
    const taskA = createA.tasks.find((task) => task.name === "Registration A");
    expect(taskA).toBeTruthy();

    await new Promise((resolve) => setTimeout(resolve, 2));

    await mockApi.createTaskFromConsole({
      fromNodeId: taskA?.nodeId ?? null,
      instanceId: taskA?.instanceId ?? null,
      nodeType: "xorGateway",
      label: "Severity?",
      conditionExpression: "critical | non_critical",
      assignedRole: "reception",
      createdByRole: "reception",
      patientName: "Patient A",
      patientId: "P-A",
    });

    await new Promise((resolve) => setTimeout(resolve, 2));

    const createB = await mockApi.createTaskFromConsole({
      nodeType: "userTask",
      label: "Registration B",
      assignedRole: "reception",
      createdByRole: "reception",
      patientName: "Patient B",
      patientId: "P-B",
    });
    const taskB = createB.tasks.find((task) => task.name === "Registration B");
    expect(taskB).toBeTruthy();

    const graphA = await mockApi.fetchTaskDesignerGraph(taskA!.id);
    const graphB = await mockApi.fetchTaskDesignerGraph(taskB!.id);

    expect(graphA.nodes.length).toBeGreaterThan(0);
    expect(graphB.nodes.length).toBeGreaterThan(0);

    expect(graphA.nodes.every((node) => node.data.instanceId === taskA!.instanceId)).toBe(true);
    expect(graphB.nodes.every((node) => node.data.instanceId === taskB!.instanceId)).toBe(true);

    expect(graphA.nodes.some((node) => node.type === "xorGateway")).toBe(true);
    expect(graphB.nodes.some((node) => node.type === "xorGateway")).toBe(false);
  });
});
