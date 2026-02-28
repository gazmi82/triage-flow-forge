import { describe, expect, it, vi } from "vitest";
import { inMemoryApi } from "@/data/inMemoryApi";
import { inMemoryStore } from "@/data/api/state";
import type { BootstrapSeed } from "@/data/contracts";

const seed: BootstrapSeed = {
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

vi.mock("@/data/bootstrapSeedApi", () => ({
  fetchBootstrapSeed: async () => seed,
}));

describe("instance graph isolation", () => {
  it("keeps each task instance on its own process path", async () => {
    // Fresh bootstrap per test run
    inMemoryStore.initialized = false;
    await inMemoryApi.fetchBootstrapData();

    const createA = await inMemoryApi.createTaskFromConsole({
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

    await inMemoryApi.createTaskFromConsole({
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

    const createB = await inMemoryApi.createTaskFromConsole({
      nodeType: "userTask",
      label: "Registration B",
      assignedRole: "reception",
      createdByRole: "reception",
      patientName: "Patient B",
      patientId: "P-B",
    });
    const taskB = createB.tasks.find((task) => task.name === "Registration B");
    expect(taskB).toBeTruthy();

    const graphA = await inMemoryApi.fetchTaskDesignerGraph(taskA!.id);
    const graphB = await inMemoryApi.fetchTaskDesignerGraph(taskB!.id);

    expect(graphA.nodes.length).toBeGreaterThan(0);
    expect(graphB.nodes.length).toBeGreaterThan(0);

    expect(graphA.nodes.every((node) => node.data.instanceId === taskA!.instanceId)).toBe(true);
    expect(graphB.nodes.every((node) => node.data.instanceId === taskB!.instanceId)).toBe(true);

    expect(graphA.nodes.some((node) => node.type === "xorGateway")).toBe(true);
    expect(graphB.nodes.some((node) => node.type === "xorGateway")).toBe(false);
  });
});
