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
} from "@/data/workflowLogic";

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
  mockStore.instances = deepClone(seed.instances);
  mockStore.tasks = deepClone(seed.tasks);
  mockStore.audit = deepClone(seed.audit);
  mockStore.credentials = deepClone(seed.authCredentials);
  mockStore.designerGraph = deepClone(INITIAL_DESIGNER_GRAPH);
  mockStore.drafts = [];
  mockStore.savedTasks = deepClone(seed.tasks).map((task) => ({
    ...task,
    updatedAt: task.updatedAt ?? task.createdAt,
    processStatus: task.status === "completed" ? "closed" : "open",
  }));
};

export const ensureInitialized = async () => {
  if (mockStore.initialized) return;
  const seed = await fetchMockSeed();
  applySeed(seed);
  mockStore.initialized = true;
};

export const syncEmergencyTriageTasksFromDesigner = () => {
  const triageUserTasks = getOrderedUserTaskNodes(mockStore.designerGraph);
  const generatedEmergencyTasks: Task[] = triageUserTasks.map((node, index) => {
    const now = Date.now();
    const due = new Date(now + (index + 1) * 15 * 60 * 1000).toISOString();
    const role = roleLabelToKey(node.data.role);

    return {
      id: `t-${node.id}`,
      nodeId: node.id,
      instanceId: "pi-designer-001",
      definitionName: "Emergency Triage",
      name: node.data.label ?? "User Task",
      assignee: null,
      role,
      status: "pending",
      priority: index === 0 ? "high" : "medium",
      createdAt: new Date(now).toISOString(),
      dueAt: due,
      slaMinutes: 30,
      minutesRemaining: 30 - index * 2,
      patientName: "Generated from Designer",
      patientId: `P-DES-${String(index + 1).padStart(3, "0")}`,
      formFields: getFormFieldsForUserTask(node.data.label ?? "User Task", role),
    };
  });

  mockStore.tasks = generatedEmergencyTasks;
  mockStore.savedTasks = generatedEmergencyTasks.map((task) => ({
    ...task,
    updatedAt: task.updatedAt ?? new Date().toISOString(),
    processStatus: "open" as const,
  }));

  mockStore.instances = mockStore.instances.map((instance) => {
    if (instance.definitionName !== "Emergency Triage") return instance;
    return {
      ...instance,
      currentNode: triageUserTasks[0]?.data.label ?? "No Active User Task",
    };
  });

  if (!mockStore.instances.some((instance) => instance.id === "pi-designer-001")) {
    mockStore.instances = [
      ...mockStore.instances,
      {
        id: "pi-designer-001",
        definitionId: "def1",
        definitionName: "Emergency Triage",
        status: "active",
        startedAt: new Date().toISOString(),
        startedBy: "System",
        currentNode: triageUserTasks[0]?.data.label ?? "No Active User Task",
        priority: "medium",
        patientId: "P-DES-ROOT",
        patientName: "Designer Sandbox",
      },
    ];
  }

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
