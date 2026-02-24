export type Role = "reception" | "triage_nurse" | "physician" | "lab" | "radiology" | "admin";
export type TaskStatus = "pending" | "claimed" | "completed" | "overdue";
export type DesignerTaskStatus = "pending" | "claimed" | "completed";
export type TriageColor = "red" | "orange" | "yellow" | "green" | "blue";
export type BpmnNodeType =
  | "startEvent"
  | "endEvent"
  | "userTask"
  | "xorGateway"
  | "andGateway"
  | "timerEvent"
  | "messageEvent"
  | "signalEvent";
export type BpmnEdgeType = "sequenceFlow" | "messageFlow" | "association";
export type EventDefinitionType = "none" | "timer" | "message" | "signal";
export type GatewayDirection = "unspecified" | "converging" | "diverging" | "mixed";

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
  status: TaskStatus;
  priority: "low" | "medium" | "high" | "critical";
  createdAt: string;
  dueAt: string;
  slaMinutes: number;
  minutesRemaining: number;
  patientName: string;
  patientId: string;
  formFields: FormField[];
  formValues?: Record<string, string | boolean>;
  updatedAt?: string;
  triageCategory?: "urgent" | "non_urgent";
  triageColor?: TriageColor;
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
  eventType: "instance_started" | "task_created" | "task_claimed" | "task_completed" | "timer_fired" | "message_received" | "signal_received" | "gateway_passed";
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
  nodes: DesignerGraphNode[];
  edges: DesignerGraphEdge[];
}

export interface DesignerGraphNodeData extends Record<string, unknown> {
  label?: string;
  role?: string;
  instanceId?: string;
  taskStatus?: DesignerTaskStatus;
  runtimeActive?: boolean;
  eventDefinitionType?: EventDefinitionType;
  gatewayDirection?: GatewayDirection;
  laneRef?: Exclude<Role, "admin">;
  conditionExpression?: string;
  correlationKey?: string;
  triageColor?: TriageColor;
}

export interface DesignerGraphNode {
  id: string;
  type: BpmnNodeType;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  style?: Record<string, string | number>;
  data: DesignerGraphNodeData;
}

export interface DesignerGraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: BpmnEdgeType;
  label?: string;
  labelStyle?: Record<string, string | number>;
  labelBgStyle?: Record<string, string | number>;
  labelBgPadding?: [number, number];
  labelBgBorderRadius?: number;
  markerEnd?: { type: string };
  style?: Record<string, string | number>;
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
  nodeType: BpmnNodeType;
  label: string;
  conditionExpression?: string;
  correlationKey?: string;
  triageColor?: TriageColor;
  assignedRole: Role;
  createdByRole: Role;
  patientName?: string;
  patientId?: string;
  registrationNote?: string;
  formValues?: Record<string, string | boolean>;
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
