import type {
  AuditEvent,
  AuthCredential,
  AuthPayload,
  CreateTaskFromConsolePayload,
  DesignerGraphPayload,
  DraftRecord,
  MockDataSeed,
  ProcessDefinition,
  ProcessInstance,
  SavedTaskRecord,
  Task,
  User,
  WorkflowBootstrapPayload,
} from "@/data/mockData";
import { fetchMockSeed } from "@/data/mockSeedApi";
import {
  INITIAL_DESIGNER_GRAPH,
  buildInstanceDesignerGraph,
  deepClone,
  getDefaultAssigneeForRole,
  getFormFieldsForUserTask,
  getOrderedUserTaskNodes,
  getRoleLabel,
  roleLabelToKey,
  upsertSavedTask,
} from "@/data/workflowLogic";

const sleep = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

let initialized = false;
let mockUsersStore: User[] = [];
let mockDefinitionsStore: ProcessDefinition[] = [];
let mockInstancesStore: ProcessInstance[] = [];
let mockTasksStore: Task[] = [];
let mockSavedTasksStore: SavedTaskRecord[] = [];
let mockAuditStore: AuditEvent[] = [];
let mockCredentialsStore: AuthCredential[] = [];
let mockDesignerGraphStore: DesignerGraphPayload = deepClone(INITIAL_DESIGNER_GRAPH);
let mockDraftsStore: DraftRecord[] = [];

const toAuthPayload = (user: User): AuthPayload => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
});

const applySeed = (seed: MockDataSeed) => {
  mockUsersStore = deepClone(seed.users);
  mockDefinitionsStore = deepClone(seed.definitions);
  mockInstancesStore = deepClone(seed.instances);
  mockTasksStore = deepClone(seed.tasks);
  mockAuditStore = deepClone(seed.audit);
  mockCredentialsStore = deepClone(seed.authCredentials);
  mockDesignerGraphStore = deepClone(INITIAL_DESIGNER_GRAPH);
  mockDraftsStore = [];
  mockSavedTasksStore = deepClone(seed.tasks).map((task) => ({
    ...task,
    updatedAt: task.updatedAt ?? task.createdAt,
    processStatus: task.status === "completed" ? "closed" : "open",
  }));
};

const ensureInitialized = async () => {
  if (initialized) return;
  const seed = await fetchMockSeed();
  applySeed(seed);
  initialized = true;
};

const syncEmergencyTriageTasksFromDesigner = () => {
  const triageUserTasks = getOrderedUserTaskNodes(mockDesignerGraphStore);
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

  mockTasksStore = generatedEmergencyTasks;
  mockSavedTasksStore = generatedEmergencyTasks.map((task) => ({
    ...task,
    updatedAt: task.updatedAt ?? new Date().toISOString(),
    processStatus: "open" as const,
  }));

  mockInstancesStore = mockInstancesStore.map((instance) => {
    if (instance.definitionName !== "Emergency Triage") return instance;
    return {
      ...instance,
      currentNode: triageUserTasks[0]?.data.label ?? "No Active User Task",
    };
  });

  if (!mockInstancesStore.some((instance) => instance.id === "pi-designer-001")) {
    mockInstancesStore = [
      ...mockInstancesStore,
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

  mockDesignerGraphStore = {
    ...mockDesignerGraphStore,
    nodes: mockDesignerGraphStore.nodes.map((node) =>
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

export const mockApi = {
  async fetchBootstrapData(): Promise<WorkflowBootstrapPayload> {
    await ensureInitialized();
    await sleep();
    return {
      users: deepClone(mockUsersStore),
      definitions: deepClone(mockDefinitionsStore),
      instances: deepClone(mockInstancesStore),
      tasks: deepClone(mockTasksStore),
      savedTasks: deepClone(mockSavedTasksStore),
      audit: deepClone(mockAuditStore),
      graph: deepClone(mockDesignerGraphStore),
      drafts: deepClone(mockDraftsStore),
    };
  },

  async fetchUsers(): Promise<User[]> {
    await ensureInitialized();
    await sleep();
    return deepClone(mockUsersStore);
  },

  async fetchDefinitions(): Promise<ProcessDefinition[]> {
    await ensureInitialized();
    await sleep();
    return deepClone(mockDefinitionsStore);
  },

  async fetchInstances(): Promise<ProcessInstance[]> {
    await ensureInitialized();
    await sleep();
    return deepClone(mockInstancesStore);
  },

  async fetchTasks(): Promise<Task[]> {
    await ensureInitialized();
    await sleep();
    return deepClone(mockTasksStore);
  },

  async fetchSavedTasks(): Promise<SavedTaskRecord[]> {
    await ensureInitialized();
    await sleep();
    return deepClone(mockSavedTasksStore);
  },

  async fetchAudit(): Promise<AuditEvent[]> {
    await ensureInitialized();
    await sleep();
    return deepClone(mockAuditStore);
  },

  async fetchDesignerGraph(): Promise<DesignerGraphPayload> {
    await ensureInitialized();
    await sleep();
    return deepClone(mockDesignerGraphStore);
  },

  async fetchTaskDesignerGraph(taskId: string): Promise<DesignerGraphPayload> {
    await ensureInitialized();
    await sleep();
    const task = mockSavedTasksStore.find((item) => item.id === taskId) ?? mockTasksStore.find((item) => item.id === taskId);
    if (!task) {
      return deepClone(INITIAL_DESIGNER_GRAPH);
    }
    const instanceTasks = mockSavedTasksStore.filter((item) => item.instanceId === task.instanceId);
    return buildInstanceDesignerGraph(instanceTasks);
  },

  async fetchDrafts(): Promise<DraftRecord[]> {
    await ensureInitialized();
    await sleep();
    return deepClone(mockDraftsStore);
  },

  async saveDraft(payload: DesignerGraphPayload): Promise<{ graph: DesignerGraphPayload; drafts: DraftRecord[] }> {
    await ensureInitialized();
    await sleep();
    mockDesignerGraphStore = deepClone(payload);
    const nextVersion = mockDraftsStore.length + 1;
    const draft: DraftRecord = {
      id: `draft-${Date.now()}`,
      name: "Emergency Triage",
      version: nextVersion,
      savedAt: new Date().toISOString(),
      graph: deepClone(payload),
    };
    mockDraftsStore = [draft, ...mockDraftsStore];
    return { graph: deepClone(mockDesignerGraphStore), drafts: deepClone(mockDraftsStore) };
  },

  async publishDesignerGraph(payload: DesignerGraphPayload): Promise<{ graph: DesignerGraphPayload; tasks: Task[]; instances: ProcessInstance[] }> {
    await ensureInitialized();
    await sleep();
    mockDesignerGraphStore = deepClone(payload);
    syncEmergencyTriageTasksFromDesigner();
    return {
      graph: deepClone(mockDesignerGraphStore),
      tasks: deepClone(mockTasksStore),
      instances: deepClone(mockInstancesStore),
    };
  },

  async claimTask(taskId: string, assigneeName: string): Promise<{ tasks: Task[]; savedTasks: SavedTaskRecord[]; graph: DesignerGraphPayload; instances: ProcessInstance[]; audit: AuditEvent[] }> {
    await ensureInitialized();
    await sleep();
    const now = new Date().toISOString();
    mockTasksStore = mockTasksStore.map((task) => (task.id === taskId ? { ...task, status: "claimed", assignee: assigneeName, updatedAt: now } : task));

    const task = mockTasksStore.find((item) => item.id === taskId);
    if (task?.nodeId) {
      mockDesignerGraphStore = {
        ...mockDesignerGraphStore,
        nodes: mockDesignerGraphStore.nodes.map((node) =>
          node.id === task.nodeId ? { ...node, data: { ...node.data, taskStatus: "claimed" } } : node
        ),
      };

      mockAuditStore = [
        {
          id: `ae-${Date.now()}`,
          instanceId: task.instanceId,
          timestamp: new Date().toISOString(),
          actor: assigneeName,
          role: task.role,
          eventType: "task_claimed",
          nodeId: task.nodeId,
          nodeName: task.name,
          payload: { source: "task_console" },
        },
        ...mockAuditStore,
      ];

      mockSavedTasksStore = upsertSavedTask(mockSavedTasksStore, task, "open");
    }

    return {
      tasks: deepClone(mockTasksStore),
      savedTasks: deepClone(mockSavedTasksStore),
      graph: deepClone(mockDesignerGraphStore),
      instances: deepClone(mockInstancesStore),
      audit: deepClone(mockAuditStore),
    };
  },

  async completeTask(taskId: string, actor: string): Promise<{ tasks: Task[]; savedTasks: SavedTaskRecord[]; audit: AuditEvent[]; graph: DesignerGraphPayload; instances: ProcessInstance[] }> {
    await ensureInitialized();
    await sleep();
    const completed = mockTasksStore.find((task) => task.id === taskId);
    mockTasksStore = mockTasksStore.filter((task) => task.id !== taskId);

    if (completed) {
      if (completed.nodeId) {
        mockDesignerGraphStore = {
          ...mockDesignerGraphStore,
          nodes: mockDesignerGraphStore.nodes.map((node) =>
            node.id === completed.nodeId ? { ...node, data: { ...node.data, taskStatus: "completed" } } : node
          ),
        };
      }
      mockAuditStore = [
        {
          id: `ae-${Date.now()}`,
          instanceId: completed.instanceId,
          timestamp: new Date().toISOString(),
          actor,
          role: completed.role,
          eventType: "task_completed",
          nodeId: completed.id,
          nodeName: completed.name,
          payload: { source: "task_console" },
        },
        ...mockAuditStore,
      ];
      mockSavedTasksStore = upsertSavedTask(mockSavedTasksStore, { ...completed, status: "completed", updatedAt: new Date().toISOString() }, "closed");

      mockInstancesStore = mockInstancesStore.map((instance) => {
        if (instance.id !== completed.instanceId) return instance;
        const nextTask = mockTasksStore.find((task) => task.instanceId === completed.instanceId);
        return {
          ...instance,
          currentNode: nextTask?.name ?? "Completed",
          status: nextTask ? "active" : "completed",
        };
      });
    }

    return {
      tasks: deepClone(mockTasksStore),
      savedTasks: deepClone(mockSavedTasksStore),
      audit: deepClone(mockAuditStore),
      graph: deepClone(mockDesignerGraphStore),
      instances: deepClone(mockInstancesStore),
    };
  },

  async createTaskFromConsole(payload: CreateTaskFromConsolePayload): Promise<{ tasks: Task[]; savedTasks: SavedTaskRecord[]; graph: DesignerGraphPayload; instances: ProcessInstance[]; audit: AuditEvent[] }> {
    await ensureInitialized();
    await sleep();
    const timestamp = Date.now();
    const instanceId = payload.instanceId && payload.instanceId.trim().length > 0 ? payload.instanceId : `pi-flow-${timestamp}`;
    const newNodeId = `node-${timestamp}`;
    const hasNodes = mockDesignerGraphStore.nodes.length > 0;
    const startNode = mockDesignerGraphStore.nodes.find((node) => node.type === "startEvent");
    const sourceNodeId = payload.fromNodeId && mockDesignerGraphStore.nodes.some((n) => n.id === payload.fromNodeId)
      ? payload.fromNodeId
      : startNode?.id;

    const newNode = {
      id: newNodeId,
      type: payload.nodeType,
      position: {
        x: 220 + mockDesignerGraphStore.nodes.length * 90,
        y: 180 + (mockDesignerGraphStore.nodes.length % 3) * 80,
      },
      width: payload.nodeType === "userTask" ? 220 : 40,
      height: payload.nodeType === "userTask" ? 110 : 40,
      style: { width: payload.nodeType === "userTask" ? 220 : 40, height: payload.nodeType === "userTask" ? 110 : 40 },
      data: {
        label: payload.label,
        role: getRoleLabel(payload.assignedRole),
        taskStatus: payload.nodeType === "userTask" ? "pending" as const : undefined,
      },
    };

    const nodesToAdd: DesignerGraphPayload["nodes"] = [];
    if (!hasNodes && payload.nodeType !== "startEvent") {
      nodesToAdd.push({
        id: "start-root",
        type: "startEvent",
        position: { x: 80, y: 200 },
        width: 40,
        height: 40,
        style: { width: 40, height: 40 },
        data: { label: "Start" },
      });
    }
    nodesToAdd.push(newNode);

    const edgesToAdd: DesignerGraphPayload["edges"] = [];
    const resolvedSource = sourceNodeId ?? (nodesToAdd.find((n) => n.id === "start-root")?.id ?? null);
    if (resolvedSource && resolvedSource !== newNodeId) {
      edgesToAdd.push({
        id: `edge-${timestamp}`,
        source: resolvedSource,
        target: newNodeId,
        markerEnd: { type: "arrowclosed" },
        style: { stroke: "hsl(220,68%,30%)" },
      });
    }

    mockDesignerGraphStore = {
      ...mockDesignerGraphStore,
      nodes: [...mockDesignerGraphStore.nodes, ...nodesToAdd],
      edges: [...mockDesignerGraphStore.edges, ...edgesToAdd],
    };

    if (payload.nodeType === "userTask") {
      const createdAt = new Date().toISOString();
      const dueAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const defaultAssignee = getDefaultAssigneeForRole(mockUsersStore, payload.assignedRole);
      const createdTask: Task = {
        id: `t-${newNodeId}`,
        nodeId: newNodeId,
        instanceId,
        definitionName: "Emergency Triage",
        name: payload.label,
        assignee: defaultAssignee,
        role: payload.assignedRole,
        status: "claimed",
        priority: payload.createdByRole === "reception" ? "high" : "medium",
        createdAt,
        dueAt,
        slaMinutes: 30,
        minutesRemaining: 30,
        patientName: payload.patientName?.trim() || "Unknown Patient",
        patientId: payload.patientId?.trim() || "P-UNSET",
        formFields: getFormFieldsForUserTask(payload.label, payload.assignedRole),
        updatedAt: createdAt,
      };

      mockTasksStore = [createdTask, ...mockTasksStore];
      mockSavedTasksStore = upsertSavedTask(mockSavedTasksStore, createdTask, "open");

      mockAuditStore = [
        {
          id: `ae-${Date.now()}`,
          instanceId: createdTask.instanceId,
          timestamp: new Date().toISOString(),
          actor: "System",
          role: createdTask.role,
          eventType: "task_created",
          nodeId: createdTask.nodeId ?? createdTask.id,
          nodeName: createdTask.name,
          payload: { source: "task_console" },
        },
        {
          id: `ae-${Date.now() + 1}`,
          instanceId: createdTask.instanceId,
          timestamp: new Date().toISOString(),
          actor: defaultAssignee,
          role: createdTask.role,
          eventType: "task_claimed",
          nodeId: createdTask.nodeId ?? createdTask.id,
          nodeName: createdTask.name,
          payload: { source: "task_console", autoClaimed: true },
        },
        ...mockAuditStore,
      ];
    }

    if (!mockInstancesStore.some((instance) => instance.id === instanceId)) {
      mockInstancesStore = [
        ...mockInstancesStore,
        {
          id: instanceId,
          definitionId: "def1",
          definitionName: "Emergency Triage",
          status: "active",
          startedAt: new Date().toISOString(),
          startedBy: "System",
          currentNode: payload.label,
          priority: "medium",
          patientId: payload.patientId?.trim() || "P-UNSET",
          patientName: payload.patientName?.trim() || "Unknown Patient",
        },
      ];
    } else {
      mockInstancesStore = mockInstancesStore.map((instance) =>
        instance.id === instanceId ? { ...instance, currentNode: payload.label } : instance
      );
    }

    return {
      tasks: deepClone(mockTasksStore),
      savedTasks: deepClone(mockSavedTasksStore),
      graph: deepClone(mockDesignerGraphStore),
      instances: deepClone(mockInstancesStore),
      audit: deepClone(mockAuditStore),
    };
  },

  async login(email: string, password: string): Promise<AuthPayload> {
    await ensureInitialized();
    await sleep();
    const normalizedEmail = email.trim().toLowerCase();
    const credential = mockCredentialsStore.find((c) => c.email.toLowerCase() === normalizedEmail);
    if (!credential || credential.password !== password) {
      throw new Error("Invalid email or password.");
    }
    const user = mockUsersStore.find((u) => u.id === credential.userId && u.active);
    if (!user) {
      throw new Error("User not found or inactive.");
    }
    return toAuthPayload(user);
  },

  async register(payload: { name: string; email: string; password: string; role: User["role"]; department: string }): Promise<AuthPayload> {
    await ensureInitialized();
    await sleep();
    const normalizedEmail = payload.email.trim().toLowerCase();
    const exists = mockUsersStore.some((u) => u.email.toLowerCase() === normalizedEmail);
    if (exists) {
      throw new Error("An account with this email already exists.");
    }

    const newUser: User = {
      id: `u${mockUsersStore.length + 1}`,
      name: payload.name.trim(),
      email: normalizedEmail,
      role: payload.role,
      department: payload.department.trim(),
      active: true,
    };

    mockUsersStore = [...mockUsersStore, newUser];
    mockCredentialsStore = [...mockCredentialsStore, { email: normalizedEmail, password: payload.password, userId: newUser.id }];

    return toAuthPayload(newUser);
  },
};
