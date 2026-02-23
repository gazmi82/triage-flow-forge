import { BPMN_SUPPORTED_NODE_TYPES, ROLE_LABELS } from "@/data/constants";
import type {
  BpmnNodeType,
  DesignerGraphNodeData,
  DesignerGraphPayload,
  EventDefinitionType,
  GatewayDirection,
  Role,
  SavedTaskRecord,
  Task,
  User,
  FormField,
} from "@/data/mockData";

export const INITIAL_DESIGNER_GRAPH: DesignerGraphPayload = {
  nodes: [],
  edges: [],
};

export const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const isSupportedBpmnNodeType = (type: string): type is BpmnNodeType =>
  BPMN_SUPPORTED_NODE_TYPES.includes(type as BpmnNodeType);

const getEventDefinitionType = (nodeType: BpmnNodeType): EventDefinitionType => {
  if (nodeType === "timerEvent") return "timer";
  if (nodeType === "messageEvent") return "message";
  if (nodeType === "signalEvent") return "signal";
  return "none";
};

const getGatewayDirection = (nodeType: BpmnNodeType): GatewayDirection =>
  nodeType === "xorGateway" || nodeType === "andGateway" ? "diverging" : "unspecified";

export const buildBpmnNodeData = (
  nodeType: BpmnNodeType,
  input: {
    label?: string;
    role?: string;
    taskStatus?: "pending" | "claimed" | "completed";
    laneRef?: Exclude<Role, "admin">;
    instanceId?: string;
  }
): DesignerGraphNodeData => ({
  label: input.label,
  role: input.role,
  instanceId: input.instanceId,
  taskStatus: input.taskStatus,
  laneRef: input.laneRef,
  eventDefinitionType: getEventDefinitionType(nodeType),
  gatewayDirection: getGatewayDirection(nodeType),
});

export const roleLabelToKey = (value: string | undefined): Role => {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "reception") return "reception";
  if (normalized === "triage nurse") return "triage_nurse";
  if (normalized === "physician") return "physician";
  if (normalized === "laboratory" || normalized === "lab") return "lab";
  if (normalized === "radiology") return "radiology";
  return "triage_nurse";
};

export const getRoleLabel = (role: Role): string => ROLE_LABELS[role];

export const getDefaultAssigneeForRole = (users: User[], role: Role): string => {
  const candidate = users.find((user) => user.active && user.role === role);
  return candidate?.name ?? "Unassigned";
};

export const getFormFieldsForUserTask = (taskName: string, role: Role): FormField[] => {
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

  return [{ id: "notes", label: "Execution Notes", type: "textarea", required: false }];
};

export const buildInstanceDesignerGraph = (instanceTasks: SavedTaskRecord[]): DesignerGraphPayload => {
  const ordered = [...instanceTasks].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  if (ordered.length === 0) {
    return deepClone(INITIAL_DESIGNER_GRAPH);
  }

  const startX = 80;
  const taskStartX = 260;
  const taskY = 150;
  const taskSpacingX = 300;
  const endPaddingX = 140;

  const nodes: DesignerGraphPayload["nodes"] = [
    {
      id: `start-${ordered[0].instanceId}`,
      type: "startEvent",
      position: { x: startX, y: 180 },
      width: 40,
      height: 40,
      style: { width: 40, height: 40 },
      data: buildBpmnNodeData("startEvent", { label: "Start", instanceId: ordered[0].instanceId }),
    },
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
      data: buildBpmnNodeData("userTask", {
        label: task.name,
        role: ROLE_LABELS[task.role],
        taskStatus: task.status === "completed" ? "completed" : task.status === "claimed" ? "claimed" : "pending",
        laneRef: task.role === "admin" ? undefined : task.role,
        instanceId: task.instanceId,
      }),
    });
  });

  const endId = `end-${ordered[0].instanceId}`;
  const endX = taskStartX + ordered.length * taskSpacingX + endPaddingX;
  nodes.push({
    id: endId,
    type: "endEvent",
    position: { x: endX, y: 180 },
    width: 40,
    height: 40,
    style: { width: 40, height: 40 },
    data: buildBpmnNodeData("endEvent", { label: "End", instanceId: ordered[0].instanceId }),
  });

  const startId = `start-${ordered[0].instanceId}`;
  edges.push({
    id: `edge-${startId}-${ordered[0].id}`,
    source: startId,
    target: ordered[0].nodeId ?? `node-${ordered[0].id}`,
    type: "sequenceFlow",
    markerEnd: { type: "arrowclosed" },
    style: { stroke: "hsl(220,68%,30%)" },
  });

  for (let i = 0; i < ordered.length - 1; i += 1) {
    edges.push({
      id: `edge-${ordered[i].id}-${ordered[i + 1].id}`,
      source: ordered[i].nodeId ?? `node-${ordered[i].id}`,
      target: ordered[i + 1].nodeId ?? `node-${ordered[i + 1].id}`,
      type: "sequenceFlow",
      markerEnd: { type: "arrowclosed" },
      style: { stroke: "hsl(220,68%,30%)" },
    });
  }

  edges.push({
    id: `edge-${ordered[ordered.length - 1].id}-${endId}`,
    source: ordered[ordered.length - 1].nodeId ?? `node-${ordered[ordered.length - 1].id}`,
    target: endId,
    type: "sequenceFlow",
    markerEnd: { type: "arrowclosed" },
    style: { stroke: "hsl(220,68%,30%)" },
  });

  return { nodes, edges };
};

export const getOrderedUserTaskNodes = (graph: DesignerGraphPayload) => {
  const outgoingBySource = new Map<string, string[]>();
  graph.edges.forEach((edge) => {
    const list = outgoingBySource.get(edge.source) ?? [];
    list.push(edge.target);
    outgoingBySource.set(edge.source, list);
  });

  const startNodeIds = graph.nodes.filter((node) => node.type === "startEvent").map((node) => node.id);
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

export const upsertSavedTask = (savedTasks: SavedTaskRecord[], task: Task, processStatus: "open" | "closed"): SavedTaskRecord[] => {
  const next: SavedTaskRecord = {
    ...task,
    updatedAt: task.updatedAt ?? new Date().toISOString(),
    processStatus,
  };
  const existingIndex = savedTasks.findIndex((item) => item.id === task.id);
  if (existingIndex >= 0) {
    const clone = [...savedTasks];
    clone[existingIndex] = next;
    return clone;
  }
  return [next, ...savedTasks];
};

export const projectDesignerGraphByInstance = (
  graph: DesignerGraphPayload,
  instanceId: string
): DesignerGraphPayload => {
  const instanceNodeIds = new Set(
    graph.nodes
      .filter((node) => node.data.instanceId === instanceId)
      .map((node) => node.id)
  );

  if (instanceNodeIds.size === 0) {
    return deepClone(INITIAL_DESIGNER_GRAPH);
  }

  const nodes = graph.nodes.filter((node) => instanceNodeIds.has(node.id));
  const edges = graph.edges.filter(
    (edge) => instanceNodeIds.has(edge.source) && instanceNodeIds.has(edge.target)
  );

  return { nodes: deepClone(nodes), edges: deepClone(edges) };
};

export const mergeDesignerGraphByInstances = (
  base: DesignerGraphPayload,
  incoming: DesignerGraphPayload
): DesignerGraphPayload => {
  const affectedInstanceIds = new Set(
    incoming.nodes
      .map((node) => node.data.instanceId)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
  );

  if (affectedInstanceIds.size === 0) {
    return deepClone(incoming);
  }

  const affectedBaseNodeIds = new Set(
    base.nodes
      .filter((node) => node.data.instanceId && affectedInstanceIds.has(node.data.instanceId))
      .map((node) => node.id)
  );

  const preservedNodes = base.nodes.filter((node) => !affectedBaseNodeIds.has(node.id));
  const preservedEdges = base.edges.filter(
    (edge) => !affectedBaseNodeIds.has(edge.source) && !affectedBaseNodeIds.has(edge.target)
  );

  return {
    nodes: [...deepClone(preservedNodes), ...deepClone(incoming.nodes)],
    edges: [...deepClone(preservedEdges), ...deepClone(incoming.edges)],
  };
};
