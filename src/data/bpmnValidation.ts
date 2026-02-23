import { BPMN_SUPPORTED_EDGE_TYPES, BPMN_SUPPORTED_NODE_TYPES } from "@/data/constants";
import type {
  BpmnNodeType,
  DesignerGraphEdge,
  DesignerGraphNode,
  DesignerGraphPayload,
  EventDefinitionType,
  GatewayDirection,
  Role,
} from "@/data/mockData";
import { roleLabelToKey } from "@/data/workflowLogic";

type ValidationMode = "draft" | "publish";

export interface BpmnValidationResult {
  valid: boolean;
  errors: string[];
}

const expectedEventTypeByNode: Partial<Record<BpmnNodeType, EventDefinitionType>> = {
  timerEvent: "timer",
  messageEvent: "message",
  signalEvent: "signal",
};

const expectedGatewayDirectionByNode: Partial<Record<BpmnNodeType, GatewayDirection>> = {
  xorGateway: "diverging",
  andGateway: "diverging",
};

const isNonAdminLane = (laneRef: unknown): laneRef is Exclude<Role, "admin"> =>
  laneRef === "reception" ||
  laneRef === "triage_nurse" ||
  laneRef === "physician" ||
  laneRef === "lab" ||
  laneRef === "radiology";

const normalizeNodeData = (node: DesignerGraphNode): DesignerGraphNode["data"] => {
  const eventDefinitionType = expectedEventTypeByNode[node.type] ?? "none";
  const gatewayDirection = expectedGatewayDirectionByNode[node.type] ?? "unspecified";
  const roleAsLane = node.data.role ? roleLabelToKey(String(node.data.role)) : undefined;
  const laneRef = isNonAdminLane(node.data.laneRef) ? node.data.laneRef : roleAsLane === "admin" ? undefined : roleAsLane;

  return {
    ...node.data,
    laneRef,
    eventDefinitionType: node.data.eventDefinitionType ?? eventDefinitionType,
    gatewayDirection: node.data.gatewayDirection ?? gatewayDirection,
  };
};

export const normalizeGraphForBpmnSubset = (graph: DesignerGraphPayload): DesignerGraphPayload => ({
  nodes: graph.nodes.map((node) => ({
    ...node,
    data: normalizeNodeData(node),
  })),
  edges: graph.edges.map((edge) => ({
    ...edge,
    type: edge.type ?? "sequenceFlow",
  })),
});

export const validateDesignerGraphPayload = (
  rawGraph: DesignerGraphPayload,
  mode: ValidationMode
): BpmnValidationResult => {
  const graph = normalizeGraphForBpmnSubset(rawGraph);
  const errors: string[] = [];
  const nodeIds = new Set<string>();
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const incoming = new Map<string, DesignerGraphEdge[]>();
  const outgoing = new Map<string, DesignerGraphEdge[]>();

  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id '${node.id}'.`);
      continue;
    }
    nodeIds.add(node.id);
    if (!BPMN_SUPPORTED_NODE_TYPES.includes(node.type)) {
      errors.push(`Node '${node.id}' has unsupported type '${String(node.type)}'.`);
    }

    if (node.type === "userTask") {
      if (!node.data.label || String(node.data.label).trim().length === 0) {
        errors.push(`User task '${node.id}' must have a label.`);
      }
      if (mode === "publish" && !isNonAdminLane(node.data.laneRef)) {
        errors.push(`User task '${node.id}' must have a valid laneRef.`);
      }
    }

    if (node.type in expectedEventTypeByNode) {
      const expected = expectedEventTypeByNode[node.type];
      if (node.data.eventDefinitionType !== expected) {
        errors.push(`Node '${node.id}' must set eventDefinitionType='${expected}'.`);
      }
      if (mode === "publish" && node.type === "messageEvent") {
        if (typeof node.data.correlationKey !== "string" || node.data.correlationKey.trim().length === 0) {
          errors.push(`Message event '${node.id}' must define a correlationKey.`);
        }
      }
    }

    if (node.type in expectedGatewayDirectionByNode) {
      const expected = expectedGatewayDirectionByNode[node.type];
      if (node.data.gatewayDirection !== expected) {
        errors.push(`Gateway '${node.id}' must set gatewayDirection='${expected}'.`);
      }
    }
  }

  if (mode === "publish") {
    const startCount = graph.nodes.filter((node) => node.type === "startEvent").length;
    const endCount = graph.nodes.filter((node) => node.type === "endEvent").length;
    if (startCount < 1) errors.push("Publish requires at least one startEvent.");
    if (endCount < 1) errors.push("Publish requires at least one endEvent.");
  }

  for (const edge of graph.edges) {
    if (!edge.type) {
      errors.push(`Edge '${edge.id}' must have an explicit type.`);
    } else if (!BPMN_SUPPORTED_EDGE_TYPES.includes(edge.type)) {
      errors.push(`Edge '${edge.id}' has unsupported type '${edge.type}'.`);
    }

    if (!nodeMap.has(edge.source)) errors.push(`Edge '${edge.id}' source '${edge.source}' does not exist.`);
    if (!nodeMap.has(edge.target)) errors.push(`Edge '${edge.id}' target '${edge.target}' does not exist.`);
    if (edge.source === edge.target) errors.push(`Edge '${edge.id}' cannot be a self-loop.`);

    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge]);
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
  }

  for (const node of graph.nodes) {
    const inEdges = incoming.get(node.id) ?? [];
    const outEdges = outgoing.get(node.id) ?? [];

    if (node.type === "startEvent" && inEdges.length > 0) {
      errors.push(`Start event '${node.id}' cannot have incoming sequence flows.`);
    }
    if (node.type === "endEvent" && outEdges.length > 0) {
      errors.push(`End event '${node.id}' cannot have outgoing sequence flows.`);
    }

    if (node.type === "xorGateway" && mode === "publish" && outEdges.length > 1) {
      const allConditioned = outEdges.every((edge) => typeof edge.label === "string" && edge.label.trim().length > 0);
      if (!allConditioned) {
        errors.push(`XOR gateway '${node.id}' requires labels/conditions on all outgoing sequence flows.`);
      }
    }

    if (node.type === "andGateway" && mode === "publish") {
      const actsAsSplit = outEdges.length > 1;
      const actsAsJoin = inEdges.length > 1;
      if (!actsAsSplit && !actsAsJoin) {
        errors.push(`AND gateway '${node.id}' must split (2+ outgoing) or join (2+ incoming).`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
};
