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

export interface FormField {
  id: string;
  label: string;
  type: "text" | "select" | "number" | "textarea" | "boolean";
  required: boolean;
  options?: string[];
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

export interface MockDataSeed {
  users: User[];
  authCredentials: AuthCredential[];
  definitions: ProcessDefinition[];
  instances: ProcessInstance[];
  tasks: Task[];
  audit: AuditEvent[];
}

export interface WorkflowBootstrapPayload {
  users: User[];
  definitions: ProcessDefinition[];
  instances: ProcessInstance[];
  tasks: Task[];
  savedTasks: SavedTaskRecord[];
  audit: AuditEvent[];
  graph: DesignerGraphPayload;
  drafts: DraftRecord[];
}

export interface GrpcWorkflowEnvelope<T> {
  method: string;
  traceId: string;
  timestamp: string;
  payload: T;
}

export interface GrpcTaskMutationRequest {
  taskId: string;
  actor: string;
  role: Role;
}

export interface GrpcTaskMutationResponse {
  ok: boolean;
  message: string;
}
