export type Role = "reception" | "triage_nurse" | "physician" | "lab" | "radiology" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  active: boolean;
}

export interface AuthCredential {
  email: string;
  password: string;
  userId: string;
}

export interface ProcessDefinition {
  id: string;
  key: string;
  name: string;
  version: number;
  status: "draft" | "published" | "archived";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  description: string;
  lanes: Role[];
  instanceCount: number;
}

export interface ProcessInstance {
  id: string;
  definitionId: string;
  definitionName: string;
  status: "active" | "completed" | "suspended" | "error";
  startedAt: string;
  startedBy: string;
  currentNode: string;
  priority: "low" | "medium" | "high" | "critical";
  patientId?: string;
  patientName?: string;
}

export interface Task {
  id: string;
  nodeId?: string;
  instanceId: string;
  definitionName: string;
  name: string;
  assignee: string | null;
  role: Role;
  status: "pending" | "claimed" | "completed" | "overdue";
  priority: "low" | "medium" | "high" | "critical";
  createdAt: string;
  dueAt: string;
  slaMinutes: number;
  minutesRemaining: number;
  patientName: string;
  patientId: string;
  formFields: FormField[];
  updatedAt?: string;
}

export interface SavedTaskRecord extends Task {
  processStatus: "open" | "closed";
}

export interface FormField {
  id: string;
  label: string;
  type: "text" | "select" | "number" | "textarea" | "boolean";
  required: boolean;
  options?: string[];
}

export interface AuditEvent {
  id: string;
  instanceId: string;
  timestamp: string;
  actor: string;
  role: Role;
  eventType: "instance_started" | "task_created" | "task_claimed" | "task_completed" | "timer_fired" | "signal_received" | "gateway_passed";
  nodeId: string;
  nodeName: string;
  payload?: Record<string, unknown>;
}

export const MOCK_USERS: User[] = [
  { id: "u1", name: "Maria Santos", email: "m.santos@hospital.org", role: "reception", department: "Emergency", active: true },
  { id: "u2", name: "James Okafor", email: "j.okafor@hospital.org", role: "triage_nurse", department: "Emergency", active: true },
  { id: "u3", name: "Dr. Emily Chen", email: "e.chen@hospital.org", role: "physician", department: "Emergency", active: true },
  { id: "u4", name: "Carlos Rivera", email: "c.rivera@hospital.org", role: "lab", department: "Laboratory", active: true },
  { id: "u5", name: "Priya Nair", email: "p.nair@hospital.org", role: "radiology", department: "Radiology", active: true },
  { id: "u6", name: "Admin User", email: "admin@hospital.org", role: "admin", department: "IT", active: true },
  { id: "u7", name: "Sarah Kim", email: "s.kim@hospital.org", role: "triage_nurse", department: "Emergency", active: true },
  { id: "u8", name: "Dr. Marcus Webb", email: "m.webb@hospital.org", role: "physician", department: "ICU", active: false },
];

export const MOCK_AUTH_CREDENTIALS: AuthCredential[] = [
  { email: "m.santos@hospital.org", password: "demo123", userId: "u1" },
  { email: "j.okafor@hospital.org", password: "demo123", userId: "u2" },
  { email: "e.chen@hospital.org", password: "demo123", userId: "u3" },
  { email: "c.rivera@hospital.org", password: "demo123", userId: "u4" },
  { email: "p.nair@hospital.org", password: "demo123", userId: "u5" },
  { email: "admin@hospital.org", password: "admin123", userId: "u6" },
  { email: "s.kim@hospital.org", password: "demo123", userId: "u7" },
];

export const MOCK_DEFINITIONS: ProcessDefinition[] = [
  {
    id: "def1",
    key: "emergency_triage",
    name: "Emergency Triage",
    version: 3,
    status: "published",
    createdBy: "Admin User",
    createdAt: "2024-11-15T09:00:00Z",
    updatedAt: "2024-12-02T14:30:00Z",
    description: "Standard emergency department triage workflow from patient arrival to physician assessment.",
    lanes: ["reception", "triage_nurse", "physician"],
    instanceCount: 142,
  },
  {
    id: "def2",
    key: "lab_order_processing",
    name: "Lab Order Processing",
    version: 2,
    status: "published",
    createdBy: "Dr. Emily Chen",
    createdAt: "2024-10-20T11:00:00Z",
    updatedAt: "2024-11-28T09:15:00Z",
    description: "Laboratory test ordering, sample collection, processing, and result delivery.",
    lanes: ["physician", "lab"],
    instanceCount: 387,
  },
  {
    id: "def3",
    key: "imaging_request",
    name: "Imaging Request",
    version: 1,
    status: "published",
    createdBy: "Admin User",
    createdAt: "2024-12-01T08:00:00Z",
    updatedAt: "2024-12-01T08:00:00Z",
    description: "Radiology imaging request from physician order to report delivery.",
    lanes: ["physician", "radiology"],
    instanceCount: 58,
  },
  {
    id: "def4",
    key: "bed_assignment",
    name: "Bed Assignment",
    version: 1,
    status: "draft",
    createdBy: "Admin User",
    createdAt: "2024-12-10T10:00:00Z",
    updatedAt: "2024-12-10T10:00:00Z",
    description: "Patient bed assignment and ward transfer workflow.",
    lanes: ["reception", "triage_nurse"],
    instanceCount: 0,
  },
];

export const MOCK_INSTANCES: ProcessInstance[] = [
  { id: "pi-001", definitionId: "def1", definitionName: "Emergency Triage", status: "active", startedAt: "2024-12-19T08:12:00Z", startedBy: "Maria Santos", currentNode: "Physician Assessment", priority: "critical", patientId: "P-3821", patientName: "John Doe" },
  { id: "pi-002", definitionId: "def2", definitionName: "Lab Order Processing", status: "active", startedAt: "2024-12-19T07:45:00Z", startedBy: "Dr. Emily Chen", currentNode: "Sample Analysis", priority: "high", patientId: "P-3819", patientName: "Alice Johnson" },
  { id: "pi-003", definitionId: "def1", definitionName: "Emergency Triage", status: "active", startedAt: "2024-12-19T08:55:00Z", startedBy: "Maria Santos", currentNode: "Vital Signs Check", priority: "medium", patientId: "P-3822", patientName: "Robert Chen" },
  { id: "pi-004", definitionId: "def3", definitionName: "Imaging Request", status: "active", startedAt: "2024-12-19T06:30:00Z", startedBy: "Dr. Marcus Webb", currentNode: "Scan Acquisition", priority: "high", patientId: "P-3810", patientName: "Susan Park" },
  { id: "pi-005", definitionId: "def1", definitionName: "Emergency Triage", status: "completed", startedAt: "2024-12-19T05:00:00Z", startedBy: "Maria Santos", currentNode: "End", priority: "medium", patientId: "P-3815", patientName: "David Lee" },
  { id: "pi-006", definitionId: "def2", definitionName: "Lab Order Processing", status: "error", startedAt: "2024-12-19T04:00:00Z", startedBy: "Dr. Emily Chen", currentNode: "Result Delivery", priority: "high", patientId: "P-3817", patientName: "Emma Wilson" },
];

export const MOCK_TASKS: Task[] = [
  {
    id: "t1", instanceId: "pi-001", definitionName: "Emergency Triage", name: "Physician Assessment",
    assignee: null, role: "physician", status: "pending", priority: "critical",
    createdAt: "2024-12-19T08:30:00Z", dueAt: "2024-12-19T09:00:00Z", slaMinutes: 30, minutesRemaining: 8,
    patientName: "John Doe", patientId: "P-3821",
    formFields: [
      { id: "diagnosis", label: "Primary Diagnosis", type: "text", required: true },
      { id: "severity", label: "Severity Level", type: "select", required: true, options: ["1 - Critical", "2 - Emergent", "3 - Urgent", "4 - Less Urgent", "5 - Non-Urgent"] },
      { id: "notes", label: "Clinical Notes", type: "textarea", required: false },
      { id: "admit", label: "Admit to Hospital", type: "boolean", required: true },
    ]
  },
  {
    id: "t2", instanceId: "pi-003", definitionName: "Emergency Triage", name: "Vital Signs Check",
    assignee: "James Okafor", role: "triage_nurse", status: "claimed", priority: "medium",
    createdAt: "2024-12-19T09:00:00Z", dueAt: "2024-12-19T09:30:00Z", slaMinutes: 30, minutesRemaining: 22,
    patientName: "Robert Chen", patientId: "P-3822",
    formFields: [
      { id: "bp_sys", label: "Blood Pressure (Systolic)", type: "number", required: true },
      { id: "bp_dia", label: "Blood Pressure (Diastolic)", type: "number", required: true },
      { id: "heart_rate", label: "Heart Rate (bpm)", type: "number", required: true },
      { id: "temp", label: "Temperature (°C)", type: "number", required: true },
      { id: "spo2", label: "SpO2 (%)", type: "number", required: true },
    ]
  },
  {
    id: "t3", instanceId: "pi-002", definitionName: "Lab Order Processing", name: "Sample Analysis",
    assignee: "Carlos Rivera", role: "lab", status: "claimed", priority: "high",
    createdAt: "2024-12-19T08:00:00Z", dueAt: "2024-12-19T09:00:00Z", slaMinutes: 60, minutesRemaining: -5,
    patientName: "Alice Johnson", patientId: "P-3819",
    formFields: [
      { id: "wbc", label: "WBC Count", type: "number", required: true },
      { id: "rbc", label: "RBC Count", type: "number", required: true },
      { id: "hemoglobin", label: "Hemoglobin", type: "number", required: true },
      { id: "notes", label: "Analyst Notes", type: "textarea", required: false },
    ]
  },
  {
    id: "t4", instanceId: "pi-004", definitionName: "Imaging Request", name: "Scan Acquisition",
    assignee: "Priya Nair", role: "radiology", status: "overdue", priority: "high",
    createdAt: "2024-12-19T06:45:00Z", dueAt: "2024-12-19T07:45:00Z", slaMinutes: 60, minutesRemaining: -88,
    patientName: "Susan Park", patientId: "P-3810",
    formFields: [
      { id: "scan_type", label: "Scan Type", type: "select", required: true, options: ["CT", "MRI", "X-Ray", "Ultrasound", "PET"] },
      { id: "contrast", label: "Contrast Used", type: "boolean", required: true },
      { id: "findings", label: "Preliminary Findings", type: "textarea", required: false },
    ]
  },
];

export const MOCK_AUDIT: AuditEvent[] = [
  { id: "ae1", instanceId: "pi-001", timestamp: "2024-12-19T08:12:00Z", actor: "Maria Santos", role: "reception", eventType: "instance_started", nodeId: "start1", nodeName: "Patient Arrival", payload: { patientId: "P-3821" } },
  { id: "ae2", instanceId: "pi-001", timestamp: "2024-12-19T08:13:00Z", actor: "System", role: "reception", eventType: "task_created", nodeId: "task1", nodeName: "Registration" },
  { id: "ae3", instanceId: "pi-001", timestamp: "2024-12-19T08:14:00Z", actor: "Maria Santos", role: "reception", eventType: "task_claimed", nodeId: "task1", nodeName: "Registration" },
  { id: "ae4", instanceId: "pi-001", timestamp: "2024-12-19T08:18:00Z", actor: "Maria Santos", role: "reception", eventType: "task_completed", nodeId: "task1", nodeName: "Registration", payload: { patientName: "John Doe", dob: "1975-03-15" } },
  { id: "ae5", instanceId: "pi-001", timestamp: "2024-12-19T08:18:01Z", actor: "System", role: "triage_nurse", eventType: "task_created", nodeId: "task2", nodeName: "Triage Assessment" },
  { id: "ae6", instanceId: "pi-001", timestamp: "2024-12-19T08:20:00Z", actor: "James Okafor", role: "triage_nurse", eventType: "task_claimed", nodeId: "task2", nodeName: "Triage Assessment" },
  { id: "ae7", instanceId: "pi-001", timestamp: "2024-12-19T08:28:00Z", actor: "James Okafor", role: "triage_nurse", eventType: "task_completed", nodeId: "task2", nodeName: "Triage Assessment", payload: { triageLevel: 1, chiefComplaint: "Chest pain" } },
  { id: "ae8", instanceId: "pi-001", timestamp: "2024-12-19T08:28:01Z", actor: "System", role: "physician", eventType: "gateway_passed", nodeId: "gw1", nodeName: "Severity XOR", payload: { path: "critical" } },
  { id: "ae9", instanceId: "pi-001", timestamp: "2024-12-19T08:28:02Z", actor: "System", role: "physician", eventType: "task_created", nodeId: "task3", nodeName: "Physician Assessment" },
  { id: "ae10", instanceId: "pi-001", timestamp: "2024-12-19T08:30:00Z", actor: "System", role: "triage_nurse", eventType: "timer_fired", nodeId: "timer1", nodeName: "SLA 30min Alert", payload: { slaMinutes: 30 } },
];

export const ROLE_LABELS: Record<Role, string> = {
  reception: "Reception",
  triage_nurse: "Triage Nurse",
  physician: "Physician",
  lab: "Laboratory",
  radiology: "Radiology",
  admin: "Administrator",
};

export const ROLE_COLORS: Record<Role, string> = {
  reception: "bg-info/15 text-info border-info/30",
  triage_nurse: "bg-accent/15 text-accent border-accent/30",
  physician: "bg-primary/10 text-primary border-primary/30",
  lab: "bg-warning/15 text-warning border-warning/30",
  radiology: "bg-node-gateway-and/10 text-node-gateway-and border-node-gateway-and/20",
  admin: "bg-muted text-muted-foreground border-border",
};

export interface AuthPayload {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
}

export interface DesignerGraphPayload {
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    width?: number;
    height?: number;
    style?: Record<string, string | number>;
    data: { label?: string; role?: string; taskStatus?: "pending" | "claimed" | "completed" };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    markerEnd?: { type: string };
    style?: Record<string, string | number>;
  }>;
}

export interface DraftRecord {
  id: string;
  name: string;
  version: number;
  savedAt: string;
  graph: DesignerGraphPayload;
}

export interface CreateTaskFromConsolePayload {
  fromNodeId?: string | null;
  instanceId?: string | null;
  nodeType: DesignerGraphPayload["nodes"][number]["type"];
  label: string;
  assignedRole: Role;
  createdByRole: Role;
  patientName?: string;
  patientId?: string;
  registrationNote?: string;
}

const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const sleep = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

const INITIAL_DESIGNER_GRAPH: DesignerGraphPayload = {
  nodes: [],
  edges: [],
};

let mockUsersStore = deepClone(MOCK_USERS);
const mockDefinitionsStore = deepClone(MOCK_DEFINITIONS);
let mockInstancesStore = deepClone(MOCK_INSTANCES);
let mockTasksStore: Task[] = [];
let mockAuditStore = deepClone(MOCK_AUDIT);
let mockCredentialsStore = deepClone(MOCK_AUTH_CREDENTIALS);
let mockDesignerGraphStore = deepClone(INITIAL_DESIGNER_GRAPH);
let mockDraftsStore: DraftRecord[] = [];
let mockSavedTasksStore: SavedTaskRecord[] = [];
const buildInstanceDesignerGraph = (instanceTasks: SavedTaskRecord[]): DesignerGraphPayload => {
  const ordered = [...instanceTasks].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  if (ordered.length === 0) {
    return deepClone(INITIAL_DESIGNER_GRAPH);
  }

  const startX = 80;
  const taskStartX = 260;
  const taskY = 150;
  const taskSpacingX = 300;
  const endPaddingX = 140;

  const nodes: DesignerGraphPayload["nodes"] = [
    { id: `start-${ordered[0].instanceId}`, type: "startEvent", position: { x: startX, y: 180 }, width: 40, height: 40, style: { width: 40, height: 40 }, data: { label: "Start" } },
  ];
  const edges: DesignerGraphPayload["edges"] = [];

  ordered.forEach((task, index) => {
    const nodeId = task.nodeId ?? `node-${task.id}`;
    nodes.push({
      id: nodeId,
      type: "userTask",
      position: { x: taskStartX + index * taskSpacingX, y: taskY },
      width: 220,
      height: 110,
      style: { width: 220, height: 110 },
      data: {
        label: task.name,
        role: ROLE_LABELS[task.role],
        taskStatus: task.status === "completed" ? "completed" : task.status === "claimed" ? "claimed" : "pending",
      },
    });
  });

  const endId = `end-${ordered[0].instanceId}`;
  const endX = taskStartX + ordered.length * taskSpacingX + endPaddingX;
  nodes.push({ id: endId, type: "endEvent", position: { x: endX, y: 180 }, width: 40, height: 40, style: { width: 40, height: 40 }, data: { label: "End" } });

  const startId = `start-${ordered[0].instanceId}`;
  edges.push({
    id: `edge-${startId}-${ordered[0].id}`,
    source: startId,
    target: ordered[0].nodeId ?? `node-${ordered[0].id}`,
    markerEnd: { type: "arrowclosed" },
    style: { stroke: "hsl(220,68%,30%)" },
  });

  for (let i = 0; i < ordered.length - 1; i += 1) {
    edges.push({
      id: `edge-${ordered[i].id}-${ordered[i + 1].id}`,
      source: ordered[i].nodeId ?? `node-${ordered[i].id}`,
      target: ordered[i + 1].nodeId ?? `node-${ordered[i + 1].id}`,
      markerEnd: { type: "arrowclosed" },
      style: { stroke: "hsl(220,68%,30%)" },
    });
  }

  edges.push({
    id: `edge-${ordered[ordered.length - 1].id}-${endId}`,
    source: ordered[ordered.length - 1].nodeId ?? `node-${ordered[ordered.length - 1].id}`,
    target: endId,
    markerEnd: { type: "arrowclosed" },
    style: { stroke: "hsl(220,68%,30%)" },
  });

  return { nodes, edges };
};

const upsertSavedTask = (task: Task, processStatus: "open" | "closed") => {
  const next: SavedTaskRecord = {
    ...task,
    updatedAt: task.updatedAt ?? new Date().toISOString(),
    processStatus,
  };
  const existingIndex = mockSavedTasksStore.findIndex((item) => item.id === task.id);
  if (existingIndex >= 0) {
    mockSavedTasksStore[existingIndex] = next;
    return;
  }
  mockSavedTasksStore = [next, ...mockSavedTasksStore];
};

const roleLabelToKey = (value: string | undefined): Role => {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "reception") return "reception";
  if (normalized === "triage nurse") return "triage_nurse";
  if (normalized === "physician") return "physician";
  if (normalized === "laboratory" || normalized === "lab") return "lab";
  if (normalized === "radiology") return "radiology";
  return "triage_nurse";
};

const getFormFieldsForUserTask = (taskName: string, role: Role): FormField[] => {
  const normalized = taskName.trim().toLowerCase();

  if (normalized.includes("assessment") && role === "physician") {
    return [
      { id: "diagnosis", label: "Primary Diagnosis", type: "text", required: true },
      { id: "severity", label: "Severity Level", type: "select", required: true, options: ["Critical", "High", "Medium", "Low"] },
      { id: "admit", label: "Admit to Hospital", type: "boolean", required: true },
      { id: "notes", label: "Clinical Notes", type: "textarea", required: false },
    ];
  }

  if (normalized.includes("triage") || role === "triage_nurse") {
    return [
      { id: "vitals", label: "Vital Signs Summary", type: "textarea", required: true },
      { id: "urgency", label: "Urgency", type: "select", required: true, options: ["Critical", "Urgent", "Standard"] },
      { id: "notes", label: "Nurse Notes", type: "textarea", required: false },
    ];
  }

  if (normalized.includes("registration") || role === "reception") {
    return [
      { id: "patient_name", label: "Patient Name", type: "text", required: true },
      { id: "patient_id", label: "Patient ID", type: "text", required: true },
      { id: "notes", label: "Registration Notes", type: "textarea", required: false },
    ];
  }

  return [
    { id: "notes", label: "Execution Notes", type: "textarea", required: false },
  ];
};

const getRoleLabel = (role: Role): string => ROLE_LABELS[role];

const getOrderedUserTaskNodes = (graph: DesignerGraphPayload) => {
  const outgoingBySource = new Map<string, string[]>();
  graph.edges.forEach((edge) => {
    const list = outgoingBySource.get(edge.source) ?? [];
    list.push(edge.target);
    outgoingBySource.set(edge.source, list);
  });

  const startNodeIds = graph.nodes
    .filter((node) => node.type === "startEvent")
    .map((node) => node.id);
  const seedNodeIds = startNodeIds.length > 0 ? startNodeIds : graph.nodes.map((node) => node.id).slice(0, 1);

  const seen = new Set<string>();
  const queue = [...seedNodeIds];
  const orderedUserTasks: DesignerGraphPayload["nodes"] = [];

  while (queue.length > 0) {
    const nextId = queue.shift();
    if (!nextId || seen.has(nextId)) continue;
    seen.add(nextId);
    const node = graph.nodes.find((item) => item.id === nextId);
    if (!node) continue;

    if (node.type === "userTask" && typeof node.data?.label === "string" && node.data.label.length > 0) {
      orderedUserTasks.push(node);
    }

    const outgoing = outgoingBySource.get(node.id) ?? [];
    queue.push(...outgoing);
  }

  return orderedUserTasks;
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

  const taskStatusByNodeId = new Map<string, Task["status"]>(
    generatedEmergencyTasks.map((task) => [task.nodeId ?? "", task.status])
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

const toAuthPayload = (user: User): AuthPayload => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
});

export const mockApi = {
  async fetchUsers(): Promise<User[]> {
    await sleep();
    return deepClone(mockUsersStore);
  },

  async fetchDefinitions(): Promise<ProcessDefinition[]> {
    await sleep();
    return deepClone(mockDefinitionsStore);
  },

  async fetchInstances(): Promise<ProcessInstance[]> {
    await sleep();
    return deepClone(mockInstancesStore);
  },

  async fetchTasks(): Promise<Task[]> {
    await sleep();
    return deepClone(mockTasksStore);
  },

  async fetchSavedTasks(): Promise<SavedTaskRecord[]> {
    await sleep();
    return deepClone(mockSavedTasksStore);
  },

  async fetchAudit(): Promise<AuditEvent[]> {
    await sleep();
    return deepClone(mockAuditStore);
  },

  async fetchDesignerGraph(): Promise<DesignerGraphPayload> {
    await sleep();
    return deepClone(mockDesignerGraphStore);
  },

  async fetchTaskDesignerGraph(taskId: string): Promise<DesignerGraphPayload> {
    await sleep();
    const task = mockSavedTasksStore.find((item) => item.id === taskId) ?? mockTasksStore.find((item) => item.id === taskId);
    if (!task) {
      return deepClone(INITIAL_DESIGNER_GRAPH);
    }
    const instanceTasks = mockSavedTasksStore.filter((item) => item.instanceId === task.instanceId);
    return buildInstanceDesignerGraph(instanceTasks);
  },

  async fetchDrafts(): Promise<DraftRecord[]> {
    await sleep();
    return deepClone(mockDraftsStore);
  },

  async saveDraft(payload: DesignerGraphPayload): Promise<{ graph: DesignerGraphPayload; drafts: DraftRecord[] }> {
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
    return {
      graph: deepClone(mockDesignerGraphStore),
      drafts: deepClone(mockDraftsStore),
    };
  },

  async publishDesignerGraph(payload: DesignerGraphPayload): Promise<{ graph: DesignerGraphPayload; tasks: Task[]; instances: ProcessInstance[] }> {
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
    await sleep();
    const now = new Date().toISOString();
    mockTasksStore = mockTasksStore.map((task) =>
      task.id === taskId ? { ...task, status: "claimed", assignee: assigneeName, updatedAt: now } : task
    );

    const task = mockTasksStore.find((item) => item.id === taskId);
    if (task?.nodeId) {
      mockDesignerGraphStore = {
        ...mockDesignerGraphStore,
        nodes: mockDesignerGraphStore.nodes.map((node) =>
          node.id === task.nodeId
            ? { ...node, data: { ...node.data, taskStatus: "claimed" } }
            : node
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

      upsertSavedTask(task, "open");
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
    await sleep();
    const completed = mockTasksStore.find((task) => task.id === taskId);
    mockTasksStore = mockTasksStore.filter((task) => task.id !== taskId);

    if (completed) {
      if (completed.nodeId) {
        mockDesignerGraphStore = {
          ...mockDesignerGraphStore,
          nodes: mockDesignerGraphStore.nodes.map((node) =>
            node.id === completed.nodeId
              ? { ...node, data: { ...node.data, taskStatus: "completed" } }
              : node
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
      upsertSavedTask({ ...completed, status: "completed", updatedAt: new Date().toISOString() }, "closed");

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
      const createdTask: Task = {
        id: `t-${newNodeId}`,
        nodeId: newNodeId,
        instanceId,
        definitionName: "Emergency Triage",
        name: payload.label,
        assignee: null,
        role: payload.assignedRole,
        status: "pending",
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
      upsertSavedTask(createdTask, "open");

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

  async register(payload: { name: string; email: string; password: string; role: Role; department: string }): Promise<AuthPayload> {
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
    mockCredentialsStore = [
      ...mockCredentialsStore,
      { email: normalizedEmail, password: payload.password, userId: newUser.id },
    ];

    return toAuthPayload(newUser);
  },
};
