import type {
  AuditEvent,
  AuthCredential,
  AuthPayload,
  DesignerGraphPayload,
  DraftRecord,
  MockDataSeed,
  ProcessDefinition,
  ProcessInstance,
  SavedTaskRecord,
  Task,
  User,
} from "@/data/mockData";
import { fetchMockSeed } from "@/data/mockSeedApi";
import {
  INITIAL_DESIGNER_GRAPH,
  deepClone,
  getFormFieldsForUserTask,
  getOrderedUserTaskNodes,
  roleLabelToKey,
  triageColorToCategory,
  triageColorToPriority,
  triageColorToSlaMinutes,
} from "@/data/workflowLogic";
import type { TriageColor } from "@/data/mockData";

export const sleep = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockStore: {
  initialized: boolean;
  users: User[];
  definitions: ProcessDefinition[];
  instances: ProcessInstance[];
  tasks: Task[];
  savedTasks: SavedTaskRecord[];
  audit: AuditEvent[];
  credentials: AuthCredential[];
  designerGraph: DesignerGraphPayload;
  drafts: DraftRecord[];
} = {
  initialized: false,
  users: [],
  definitions: [],
  instances: [],
  tasks: [],
  savedTasks: [],
  audit: [],
  credentials: [],
  designerGraph: deepClone(INITIAL_DESIGNER_GRAPH),
  drafts: [],
};

export const toAuthPayload = (user: User): AuthPayload => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
});

const applySeed = (seed: MockDataSeed) => {
  mockStore.users = deepClone(seed.users);
  mockStore.definitions = deepClone(seed.definitions);
  // Runtime starts empty by design; dashboard/activity should populate only from user actions.
  mockStore.instances = [];
  mockStore.tasks = [];
  mockStore.audit = [];
  mockStore.credentials = deepClone(seed.authCredentials);
  mockStore.designerGraph = deepClone(INITIAL_DESIGNER_GRAPH);
  mockStore.drafts = [];
  mockStore.savedTasks = [];
};

export const ensureInitialized = async () => {
  if (mockStore.initialized) return;
  const seed = await fetchMockSeed();
  applySeed(seed);
  mockStore.initialized = true;
};

export const syncEmergencyTriageTasksFromDesigner = () => {
  const isTriageColor = (value: unknown): value is TriageColor =>
    value === "red" || value === "orange" || value === "yellow" || value === "green" || value === "blue";

  const userTaskNodes = getOrderedUserTaskNodes(mockStore.designerGraph);
  const byInstance = new Map<string, typeof userTaskNodes>();
  userTaskNodes.forEach((node) => {
    const instanceId = typeof node.data.instanceId === "string" && node.data.instanceId.length > 0
      ? node.data.instanceId
      : "pi-designer-001";
    const list = byInstance.get(instanceId) ?? [];
    list.push(node);
    byInstance.set(instanceId, list);
  });

  const generatedEmergencyTasks: Task[] = [];
  byInstance.forEach((nodes, instanceId) => {
    nodes.forEach((node, index) => {
      const now = Date.now();
      const role = roleLabelToKey(node.data.role);
      const statusFromNode = node.data.taskStatus;
      const status = statusFromNode === "completed" || statusFromNode === "claimed" || statusFromNode === "pending"
        ? statusFromNode
        : "pending";
      const triageColor = isTriageColor(node.data.triageColor) ? node.data.triageColor : "yellow";
      const slaMinutes = triageColorToSlaMinutes(triageColor);
      const due = new Date(now + slaMinutes * 60 * 1000).toISOString();

      generatedEmergencyTasks.push({
        id: `t-${node.id}`,
        nodeId: node.id,
        instanceId,
        definitionName: "Emergency Triage",
        name: node.data.label ?? "User Task",
        assignee: null,
        role,
        status,
        priority: triageColorToPriority(triageColor),
        createdAt: new Date(now).toISOString(),
        dueAt: due,
        slaMinutes,
        minutesRemaining: slaMinutes,
        patientName: "Generated from Designer",
        patientId: `P-DES-${String(index + 1).padStart(3, "0")}`,
        formFields: getFormFieldsForUserTask(node.data.label ?? "User Task", role),
        triageCategory: triageColorToCategory(triageColor),
        triageColor,
      });
    });
  });

  const affectedInstanceIds = new Set(byInstance.keys());

  const unaffectedTasks = mockStore.tasks.filter((task) => !affectedInstanceIds.has(task.instanceId));
  const unaffectedSavedTasks = mockStore.savedTasks.filter((task) => !affectedInstanceIds.has(task.instanceId));
  const unaffectedInstances = mockStore.instances.filter((instance) => !affectedInstanceIds.has(instance.id));

  mockStore.tasks = [...unaffectedTasks, ...generatedEmergencyTasks];
  mockStore.savedTasks = [
    ...unaffectedSavedTasks,
    ...generatedEmergencyTasks.map((task) => ({
    ...task,
    updatedAt: task.updatedAt ?? new Date().toISOString(),
    processStatus: task.status === "completed" ? "closed" as const : "open" as const,
    })),
  ];

  const nextInstances: ProcessInstance[] = [...unaffectedInstances];
  byInstance.forEach((nodes, instanceId) => {
    const firstNodeLabel = nodes[0]?.data.label ?? "No Active User Task";
    const existing = mockStore.instances.find((instance) => instance.id === instanceId);
    if (existing) {
      nextInstances.push({ ...existing, currentNode: firstNodeLabel, status: "active" });
      return;
    }
    nextInstances.push({
      id: instanceId,
      definitionId: "def1",
      definitionName: "Emergency Triage",
      status: "active",
      startedAt: new Date().toISOString(),
      startedBy: "System",
      currentNode: firstNodeLabel,
      priority: "medium",
      patientId: "P-DES-ROOT",
      patientName: "Designer Sandbox",
    });
  });
  mockStore.instances = nextInstances;

  const taskStatusByNodeId = new Map<
    string,
    NonNullable<DesignerGraphPayload["nodes"][number]["data"]["taskStatus"]>
  >(
    generatedEmergencyTasks.map((task) => [
      task.nodeId ?? "",
      task.status === "completed" ? "completed" : task.status === "claimed" ? "claimed" : "pending",
    ])
  );

  mockStore.designerGraph = {
    ...mockStore.designerGraph,
    nodes: mockStore.designerGraph.nodes.map((node) =>
      node.type === "userTask"
        ? {
            ...node,
            data: {
              ...node.data,
              taskStatus: taskStatusByNodeId.get(node.id) ?? "completed",
            },
          }
        : node
    ),
  };
};
