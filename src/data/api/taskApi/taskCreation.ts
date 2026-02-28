import type { AuditEvent, CreateTaskFromConsolePayload, DesignerGraphPayload, ProcessInstance, SavedTaskRecord, Task } from "@/data/contracts";
import { BPMN_SUPPORTED_EDGE_TYPES } from "@/data/constants";
import {
  applyRuntimeStateForInstance,
  buildBpmnNodeData,
  deepClone,
  getDefaultAssigneeForRole,
  getFormFieldsForUserTask,
  getRoleLabel,
  isSupportedBpmnNodeType,
  projectDesignerGraphByInstance,
  triageColorToCategory,
  triageColorToPriority,
  triageColorToSlaMinutes,
  upsertSavedTask,
} from "@/data/workflowLogic";
import { ensureInitialized, inMemoryStore, sleep } from "@/data/api/state";

const getPreferredCurrentNodeForInstance = (instanceId: string): string | null => {
  const openTasks = inMemoryStore.tasks.filter((task) => task.instanceId === instanceId && task.status !== "completed");
  if (openTasks.length === 0) return null;

  const score = (task: Task) => {
    if (task.status === "claimed") return 0;
    if (task.status === "overdue") return 1;
    return 2;
  };

  const prioritized = [...openTasks].sort((a, b) => {
    const statusDiff = score(a) - score(b);
    if (statusDiff !== 0) return statusDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return prioritized[0]?.name ?? null;
};

export async function createTaskFromConsole(payload: CreateTaskFromConsolePayload): Promise<{
  tasks: Task[];
  savedTasks: SavedTaskRecord[];
  graph: DesignerGraphPayload;
  instances: ProcessInstance[];
  audit: AuditEvent[];
  createdNodeId: string;
  instanceId: string;
}> {
  await ensureInitialized();
  await sleep();
  if (!isSupportedBpmnNodeType(payload.nodeType)) {
    throw new Error(`Unsupported BPMN node type: ${payload.nodeType}`);
  }

  if (!BPMN_SUPPORTED_EDGE_TYPES.includes("sequenceFlow")) {
    throw new Error("sequenceFlow is not enabled in BPMN subset profile.");
  }
  if (payload.nodeType === "messageEvent" && (!payload.correlationKey || payload.correlationKey.trim().length === 0)) {
    throw new Error("Message event requires correlationKey.");
  }
  if (payload.nodeType === "xorGateway" && (!payload.conditionExpression || payload.conditionExpression.trim().length === 0)) {
    throw new Error("XOR gateway requires conditionExpression.");
  }

  const timestamp = Date.now();
  const instanceId = payload.instanceId && payload.instanceId.trim().length > 0 ? payload.instanceId : `pi-flow-${timestamp}`;
  const newNodeId = `node-${timestamp}`;
  const instanceNodes = inMemoryStore.designerGraph.nodes.filter((node) => node.data.instanceId === instanceId);
  const existingRoleNode =
    payload.nodeType === "userTask"
      ? instanceNodes.find(
          (node) =>
            node.type === "userTask" &&
            (node.data.laneRef === payload.assignedRole || node.data.role === getRoleLabel(payload.assignedRole))
        )
      : undefined;
  const targetNodeId = existingRoleNode?.id ?? newNodeId;
  const hasInstanceNodes = instanceNodes.length > 0;
  const startNode = instanceNodes.find((node) => node.type === "startEvent");

  if (payload.nodeType === "startEvent" && startNode) {
    throw new Error(`Instance '${instanceId}' already has a startEvent.`);
  }

  if (payload.fromNodeId && !instanceNodes.some((n) => n.id === payload.fromNodeId)) {
    throw new Error(`Source node '${payload.fromNodeId}' not found in instance '${instanceId}'.`);
  }

  const sourceNodeId = payload.fromNodeId ?? startNode?.id;
  const sourceNode = sourceNodeId
    ? [...inMemoryStore.designerGraph.nodes].find((node) => node.id === sourceNodeId)
    : undefined;
  const outgoingCountFromSource = sourceNodeId
    ? inMemoryStore.designerGraph.edges.filter((edge) => edge.source === sourceNodeId).length
    : 0;

  const getNodeSize = (nodeType: CreateTaskFromConsolePayload["nodeType"]) => {
    if (nodeType === "userTask") return { width: 220, height: 110 };
    if (nodeType === "xorGateway" || nodeType === "andGateway") return { width: 64, height: 64 };
    return { width: 40, height: 40 };
  };
  const doesOverlap = (
    candidate: { x: number; y: number; width: number; height: number },
    node: (typeof instanceNodes)[number]
  ) => {
    const nodeWidth = typeof node.width === "number" ? node.width : Number(node.style?.width ?? 80);
    const nodeHeight = typeof node.height === "number" ? node.height : Number(node.style?.height ?? 80);
    return !(
      candidate.x + candidate.width + 36 < node.position.x ||
      node.position.x + nodeWidth + 36 < candidate.x ||
      candidate.y + candidate.height + 28 < node.position.y ||
      node.position.y + nodeHeight + 28 < candidate.y
    );
  };
  const getBranchOffset = (branchIndex: number) => {
    if (branchIndex === 0) return -170;
    if (branchIndex === 1) return 170;
    const level = Math.floor((branchIndex - 2) / 2) + 2;
    return branchIndex % 2 === 0 ? -170 * level : 170 * level;
  };
  const computePosition = () => {
    const size = getNodeSize(payload.nodeType);
    let x = 220 + instanceNodes.length * 320;
    let y = 180;

    if (sourceNode) {
      const sourceWidth =
        typeof sourceNode.width === "number" ? sourceNode.width : Number(sourceNode.style?.width ?? 120);
      x = sourceNode.position.x + sourceWidth + 140;
      y = sourceNode.position.y;
      if (sourceNode.type === "xorGateway" || sourceNode.type === "andGateway") {
        y = sourceNode.position.y + getBranchOffset(outgoingCountFromSource);
      }
    }

    const candidate = { x, y, width: size.width, height: size.height };
    while (instanceNodes.some((node) => doesOverlap(candidate, node))) {
      candidate.y += 140;
    }

    return { x: candidate.x, y: candidate.y, ...size };
  };
  const nodePlacement = computePosition();

  const newNode = existingRoleNode
    ? null
    : {
        id: targetNodeId,
        type: payload.nodeType,
        position: {
          x: nodePlacement.x,
          y: nodePlacement.y,
        },
        width: nodePlacement.width,
        height: nodePlacement.height,
        style: { width: nodePlacement.width, height: nodePlacement.height },
        data: {
          ...buildBpmnNodeData(payload.nodeType, {
            label: payload.label,
            role: getRoleLabel(payload.assignedRole),
            taskStatus: payload.nodeType === "userTask" ? "pending" : undefined,
            laneRef: payload.assignedRole === "admin" ? undefined : payload.assignedRole,
            instanceId,
            triageColor: payload.triageColor,
          }),
          conditionExpression: payload.conditionExpression,
          correlationKey: payload.correlationKey,
        },
      };

  const nodesToAdd: DesignerGraphPayload["nodes"] = [];
  if (!hasInstanceNodes && payload.nodeType !== "startEvent") {
    nodesToAdd.push({
      id: `start-${instanceId}`,
      type: "startEvent",
      position: { x: 80, y: 200 },
      width: 40,
      height: 40,
      style: { width: 40, height: 40 },
      data: buildBpmnNodeData("startEvent", { label: "Start", instanceId }),
    });
  }
  if (newNode) {
    nodesToAdd.push(newNode);
  }

  const edgesToAdd: DesignerGraphPayload["edges"] = [];
  const resolvedSource = sourceNodeId ?? (nodesToAdd.find((n) => n.id === `start-${instanceId}`)?.id ?? null);
  if (resolvedSource && resolvedSource !== targetNodeId) {
    const sourceNodeForLabel = inMemoryStore.designerGraph.nodes.find((node) => node.id === resolvedSource);
    const outgoingCount = inMemoryStore.designerGraph.edges.filter((edge) => edge.source === resolvedSource).length;
    const xorConditions =
      sourceNodeForLabel?.type === "xorGateway" && typeof sourceNodeForLabel.data?.conditionExpression === "string"
        ? sourceNodeForLabel.data.conditionExpression
            .split("|")
            .map((part) => part.trim())
            .filter(Boolean)
        : [];
    const xorDefaultLabel = `Condition ${String.fromCharCode(65 + outgoingCount)}`;
    const xorEdgeLabel =
      sourceNodeForLabel?.type === "xorGateway"
        ? (payload.conditionExpression?.trim() || xorConditions[outgoingCount] || xorDefaultLabel)
        : undefined;
    const andEdgeLabel =
      sourceNodeForLabel?.type === "andGateway" ? `Branch ${String.fromCharCode(65 + outgoingCount)}` : undefined;
    const andSourceHandle =
      sourceNodeForLabel?.type === "andGateway"
        ? outgoingCount % 2 === 0
          ? "top"
          : "bottom"
        : undefined;

    const edgeAlreadyExists = inMemoryStore.designerGraph.edges.some(
      (edge) => edge.source === resolvedSource && edge.target === targetNodeId
    );
    if (!edgeAlreadyExists) {
      edgesToAdd.push({
        id: `edge-${timestamp}`,
        source: resolvedSource,
        target: targetNodeId,
        sourceHandle: andSourceHandle,
        type: "sequenceFlow",
        label: xorEdgeLabel ?? andEdgeLabel,
        labelBgPadding: [6, 2],
        labelBgBorderRadius: 4,
        labelBgStyle: { fill: "rgba(255,255,255,0.92)" },
        labelStyle: {
          fontSize: 11,
          fontWeight: 600,
          fill: "hsl(220,68%,30%)",
        },
        markerEnd: { type: "arrowclosed" },
        style: { stroke: "hsl(220,68%,30%)" },
      });
    }
  }

  inMemoryStore.designerGraph = {
    ...inMemoryStore.designerGraph,
    nodes: [...inMemoryStore.designerGraph.nodes, ...nodesToAdd],
    edges: [...inMemoryStore.designerGraph.edges, ...edgesToAdd],
  };

  if (payload.nodeType === "userTask") {
    const createdAt = new Date().toISOString();
    const triageColor = payload.triageColor ?? "yellow";
    const triageCategory = triageColorToCategory(triageColor);
    const baseSlaMinutes = triageColorToSlaMinutes(triageColor);
    const dueAt = new Date(Date.now() + baseSlaMinutes * 60 * 1000).toISOString();
    const defaultAssignee = getDefaultAssigneeForRole(inMemoryStore.users, payload.assignedRole);
    const existingTaskIndex = inMemoryStore.tasks.findIndex(
      (task) => task.instanceId === instanceId && task.nodeId === targetNodeId
    );
    const existingTask = existingTaskIndex >= 0 ? inMemoryStore.tasks[existingTaskIndex] : null;
    const createdTask: Task = {
      id: existingTask?.id ?? `t-${targetNodeId}`,
      nodeId: targetNodeId,
      instanceId,
      definitionName: "Emergency Triage",
      name: existingTask?.name ?? payload.label,
      assignee: defaultAssignee,
      role: payload.assignedRole,
      status: "claimed",
      priority: triageColorToPriority(triageColor),
      createdAt,
      dueAt,
      slaMinutes: baseSlaMinutes,
      minutesRemaining: baseSlaMinutes,
      patientName: payload.patientName?.trim() || "Unknown Patient",
      patientId: payload.patientId?.trim() || "P-UNSET",
      formFields: getFormFieldsForUserTask(payload.label, payload.assignedRole),
      formValues: payload.formValues ?? existingTask?.formValues ?? {},
      updatedAt: createdAt,
      triageCategory,
      triageColor,
    };

    if (existingTaskIndex >= 0) {
      const nextTasks = [...inMemoryStore.tasks];
      nextTasks[existingTaskIndex] = createdTask;
      inMemoryStore.tasks = nextTasks;
    } else {
      inMemoryStore.tasks = [createdTask, ...inMemoryStore.tasks];
    }

    inMemoryStore.designerGraph = {
      ...inMemoryStore.designerGraph,
      nodes: inMemoryStore.designerGraph.nodes.map((node) =>
        node.id === targetNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                taskStatus: "claimed",
                triageColor,
              },
            }
          : node
      ),
    };
    inMemoryStore.savedTasks = upsertSavedTask(inMemoryStore.savedTasks, createdTask, "open");

    inMemoryStore.audit = [
      {
        id: `ae-${Date.now()}`,
        instanceId: createdTask.instanceId,
        timestamp: new Date().toISOString(),
        actor: "System",
        role: createdTask.role,
        eventType: existingTask ? "task_claimed" : "task_created",
        nodeId: createdTask.nodeId ?? createdTask.id,
        nodeName: createdTask.name,
        payload: { source: "task_console", reusedNode: Boolean(existingTask) },
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
      ...inMemoryStore.audit,
    ];
  } else {
    const eventType =
      payload.nodeType === "timerEvent"
        ? "timer_fired"
        : payload.nodeType === "signalEvent"
          ? "signal_received"
          : payload.nodeType === "messageEvent"
            ? "task_created"
            : payload.nodeType === "xorGateway" || payload.nodeType === "andGateway"
              ? "gateway_passed"
              : null;
    if (eventType) {
      inMemoryStore.audit = [
        {
          id: `ae-${Date.now()}`,
          instanceId,
          timestamp: new Date().toISOString(),
          actor: "System",
          role: payload.createdByRole,
          eventType,
          nodeId: targetNodeId,
          nodeName: payload.label,
          payload: {
            source: "runtime_engine",
            correlationKey: payload.correlationKey,
            conditionExpression: payload.conditionExpression,
            nodeType: payload.nodeType,
          },
        },
        ...inMemoryStore.audit,
      ];
    }
  }

  if (!inMemoryStore.instances.some((instance) => instance.id === instanceId)) {
    const nodeLabel = existingRoleNode ? String(existingRoleNode.data.label ?? payload.label) : payload.label;
    inMemoryStore.instances = [
      ...inMemoryStore.instances,
      {
        id: instanceId,
        definitionId: "def1",
        definitionName: "Emergency Triage",
        status: "active",
        startedAt: new Date().toISOString(),
        startedBy: "System",
        currentNode: nodeLabel,
        priority: "medium",
        patientId: payload.patientId?.trim() || "P-UNSET",
        patientName: payload.patientName?.trim() || "Unknown Patient",
      },
    ];
  } else {
    const nodeLabel = existingRoleNode ? String(existingRoleNode.data.label ?? payload.label) : payload.label;
    inMemoryStore.instances = inMemoryStore.instances.map((instance) =>
      instance.id === instanceId ? { ...instance, currentNode: nodeLabel } : instance
    );
  }

  const taskStatusByNodeId = new Map(
    inMemoryStore.tasks
      .filter((item) => item.instanceId === instanceId && item.nodeId)
      .map((item) => [item.nodeId as string, item.status])
  );
  const runtime = applyRuntimeStateForInstance(inMemoryStore.designerGraph, instanceId, taskStatusByNodeId);
  inMemoryStore.designerGraph = runtime.graph;
  inMemoryStore.instances = inMemoryStore.instances.map((instance) =>
    instance.id === instanceId
      ? {
          ...instance,
          currentNode:
            getPreferredCurrentNodeForInstance(instanceId) ??
            runtime.activeNodeLabels[0] ??
            instance.currentNode,
        }
      : instance
  );

  return {
    tasks: deepClone(inMemoryStore.tasks),
    savedTasks: deepClone(inMemoryStore.savedTasks),
    graph: projectDesignerGraphByInstance(inMemoryStore.designerGraph, instanceId),
    instances: deepClone(inMemoryStore.instances),
    audit: deepClone(inMemoryStore.audit),
    createdNodeId: targetNodeId,
    instanceId,
  };
}
