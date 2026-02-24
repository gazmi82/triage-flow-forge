import { BPMN_SUPPORTED_NODE_TYPES, ROLE_LABELS } from "@/data/constants";
import type {
  BpmnNodeType,
  DesignerGraphNodeData,
  EventDefinitionType,
  GatewayDirection,
  Role,
  TriageColor,
  User,
} from "@/data/mockData";

const ROLE_LABEL_TO_KEY: Record<string, Role> = {
  reception: "reception",
  "triage nurse": "triage_nurse",
  physician: "physician",
  laboratory: "lab",
  lab: "lab",
  radiology: "radiology",
};

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
    triageColor?: TriageColor;
  }
): DesignerGraphNodeData => ({
  label: input.label,
  role: input.role,
  instanceId: input.instanceId,
  taskStatus: input.taskStatus,
  laneRef: input.laneRef,
  triageColor: input.triageColor,
  eventDefinitionType: getEventDefinitionType(nodeType),
  gatewayDirection: getGatewayDirection(nodeType),
});

export const roleLabelToKey = (value: string | undefined): Role => {
  const normalized = (value ?? "").trim().toLowerCase();
  return ROLE_LABEL_TO_KEY[normalized] ?? "triage_nurse";
};

export const getRoleLabel = (role: Role): string => ROLE_LABELS[role];

export const getDefaultAssigneeForRole = (users: User[], role: Role): string => {
  const candidate = users.find((user) => user.active && user.role === role);
  return candidate?.name ?? "Unassigned";
};
