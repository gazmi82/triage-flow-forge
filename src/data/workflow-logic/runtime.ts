import type { DesignerGraphPayload, TaskStatus } from "@/data/contracts";
import { projectDesignerGraphByInstance } from "@/data/workflow-logic/graph";

export interface RuntimeEngineEvent {
  nodeId: string;
  nodeLabel: string;
  eventType: "timer_fired" | "signal_received" | "gateway_passed" | "message_received";
}

interface RuntimeEngineResult {
  activeNodeIds: string[];
  events: RuntimeEngineEvent[];
}

const computeRuntimeTraversalForInstance = (
  graph: DesignerGraphPayload,
  instanceId: string,
  taskStatusByNodeId: Map<string, TaskStatus>
): RuntimeEngineResult => {
  const instanceGraph = projectDesignerGraphByInstance(graph, instanceId);
  if (instanceGraph.nodes.length === 0) return { activeNodeIds: [], events: [] };

  const nodeById = new Map(instanceGraph.nodes.map((node) => [node.id, node]));
  const outBySource = new Map<string, DesignerGraphPayload["edges"]>();
  for (const edge of instanceGraph.edges) {
    const list = outBySource.get(edge.source) ?? [];
    list.push(edge);
    outBySource.set(edge.source, list);
  }

  const startNodes = instanceGraph.nodes.filter((node) => node.type === "startEvent").map((node) => node.id);
  const queue = [...startNodes];
  const active = new Set<string>();
  const events: RuntimeEngineEvent[] = [];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId) continue;
    const node = nodeById.get(nodeId);
    if (!node) continue;

    const visitKey = `${nodeId}:${queue.length}`;
    if (seen.has(visitKey)) continue;
    seen.add(visitKey);

    const outgoing = outBySource.get(nodeId) ?? [];

    if (node.type === "userTask") {
      const status = taskStatusByNodeId.get(nodeId);
      if (status === "completed") {
        outgoing.forEach((edge) => queue.push(edge.target));
      } else {
        active.add(nodeId);
      }
      continue;
    }

    if (node.type === "endEvent") continue;

    if (node.type === "xorGateway") {
      const preferredCondition = typeof node.data.conditionExpression === "string"
        ? node.data.conditionExpression.split("|").map((part) => part.trim()).find(Boolean)
        : undefined;
      const selectedEdge = preferredCondition
        ? outgoing.find((edge) => edge.label?.trim().toLowerCase() === preferredCondition.toLowerCase()) ?? outgoing[0]
        : outgoing[0];
      if (selectedEdge) queue.push(selectedEdge.target);
      events.push({
        nodeId: node.id,
        nodeLabel: String(node.data.label ?? "Decision"),
        eventType: "gateway_passed",
      });
      continue;
    }

    if (node.type === "andGateway") {
      outgoing.forEach((edge) => queue.push(edge.target));
      events.push({
        nodeId: node.id,
        nodeLabel: String(node.data.label ?? "Parallel"),
        eventType: "gateway_passed",
      });
      continue;
    }

    if (node.type === "timerEvent") {
      outgoing.forEach((edge) => queue.push(edge.target));
      events.push({
        nodeId: node.id,
        nodeLabel: String(node.data.label ?? "Timer"),
        eventType: "timer_fired",
      });
      continue;
    }

    if (node.type === "messageEvent") {
      if (typeof node.data.correlationKey === "string" && node.data.correlationKey.trim().length > 0) {
        outgoing.forEach((edge) => queue.push(edge.target));
        events.push({
          nodeId: node.id,
          nodeLabel: String(node.data.label ?? "Message"),
          eventType: "message_received",
        });
      } else {
        active.add(node.id);
      }
      continue;
    }

    if (node.type === "signalEvent") {
      outgoing.forEach((edge) => queue.push(edge.target));
      events.push({
        nodeId: node.id,
        nodeLabel: String(node.data.label ?? "Signal"),
        eventType: "signal_received",
      });
      continue;
    }

    outgoing.forEach((edge) => queue.push(edge.target));
  }

  return { activeNodeIds: Array.from(active), events };
};

export const applyRuntimeStateForInstance = (
  graph: DesignerGraphPayload,
  instanceId: string,
  taskStatusByNodeId: Map<string, TaskStatus>
): { graph: DesignerGraphPayload; activeNodeLabels: string[]; events: RuntimeEngineEvent[] } => {
  const traversal = computeRuntimeTraversalForInstance(graph, instanceId, taskStatusByNodeId);
  const activeSet = new Set(traversal.activeNodeIds);
  const activeNodeLabels: string[] = [];

  const nextGraph: DesignerGraphPayload = {
    ...graph,
    nodes: graph.nodes.map((node) => {
      if (node.data.instanceId !== instanceId) return node;
      const runtimeActive = activeSet.has(node.id);
      if (runtimeActive && typeof node.data.label === "string") {
        activeNodeLabels.push(node.data.label);
      }
      const taskStatus = node.type === "userTask" ? taskStatusByNodeId.get(node.id) : undefined;
      return {
        ...node,
        data: {
          ...node.data,
          runtimeActive,
          taskStatus:
            node.type === "userTask"
              ? taskStatus === "completed"
                ? "completed"
                : taskStatus === "claimed"
                  ? "claimed"
                  : "pending"
              : node.data.taskStatus,
        },
      };
    }),
  };

  return { graph: nextGraph, activeNodeLabels, events: traversal.events };
};
