import type { AuditEvent, DesignerGraphPayload, ProcessInstance, SavedTaskRecord, Task, TriageColor } from "@/data/contracts";
import {
  applyRuntimeStateForInstance,
  deepClone,
  projectDesignerGraphByInstance,
  triageColorToCategory,
  triageColorToPriority,
  triageColorToSlaMinutes,
  upsertSavedTask,
} from "@/data/workflowLogic";
import { ensureInitialized, inMemoryStore, sleep } from "@/data/api/state";

type TaskApiResponse = {
  tasks: Task[];
  savedTasks: SavedTaskRecord[];
  graph: DesignerGraphPayload;
  instances: ProcessInstance[];
  audit: AuditEvent[];
};

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

export async function claimTask(taskId: string, assigneeName: string): Promise<TaskApiResponse> {
  await ensureInitialized();
  await sleep();
  const now = new Date().toISOString();
  inMemoryStore.tasks = inMemoryStore.tasks.map((task) => (task.id === taskId ? { ...task, status: "claimed", assignee: assigneeName, updatedAt: now } : task));

  const task = inMemoryStore.tasks.find((item) => item.id === taskId);
  if (task?.nodeId) {
    inMemoryStore.designerGraph = {
      ...inMemoryStore.designerGraph,
      nodes: inMemoryStore.designerGraph.nodes.map((node) =>
        node.id === task.nodeId ? { ...node, data: { ...node.data, taskStatus: "claimed" } } : node
      ),
    };

    inMemoryStore.audit = [
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
      ...inMemoryStore.audit,
    ];

    inMemoryStore.savedTasks = upsertSavedTask(inMemoryStore.savedTasks, task, "open");

    const taskStatusByNodeId = new Map(
      inMemoryStore.tasks
        .filter((item) => item.instanceId === task.instanceId && item.nodeId)
        .map((item) => [item.nodeId as string, item.status])
    );
    const runtime = applyRuntimeStateForInstance(inMemoryStore.designerGraph, task.instanceId, taskStatusByNodeId);
    inMemoryStore.designerGraph = runtime.graph;
    inMemoryStore.instances = inMemoryStore.instances.map((instance) =>
      instance.id === task.instanceId
        ? {
            ...instance,
            currentNode:
              getPreferredCurrentNodeForInstance(task.instanceId) ??
              runtime.activeNodeLabels[0] ??
              instance.currentNode,
          }
        : instance
    );
  }

  return {
    tasks: deepClone(inMemoryStore.tasks),
    savedTasks: deepClone(inMemoryStore.savedTasks),
    graph: task ? projectDesignerGraphByInstance(inMemoryStore.designerGraph, task.instanceId) : deepClone(inMemoryStore.designerGraph),
    instances: deepClone(inMemoryStore.instances),
    audit: deepClone(inMemoryStore.audit),
  };
}

export async function completeTask(
  taskId: string,
  actor: string,
  patientName?: string,
  patientId?: string
): Promise<TaskApiResponse> {
  await ensureInitialized();
  await sleep();
  const completed = inMemoryStore.tasks.find((task) => task.id === taskId);

  if (completed) {
    const normalizedPatientName = patientName?.trim();
    const normalizedPatientId = patientId?.trim();
    const updatedAt = new Date().toISOString();

    inMemoryStore.tasks = inMemoryStore.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            status: "completed",
            patientName: normalizedPatientName || task.patientName,
            patientId: normalizedPatientId || task.patientId,
            updatedAt,
          }
        : task
    );

    if (completed.nodeId) {
      inMemoryStore.designerGraph = {
        ...inMemoryStore.designerGraph,
        nodes: inMemoryStore.designerGraph.nodes.map((node) =>
          node.id === completed.nodeId ? { ...node, data: { ...node.data, taskStatus: "completed" } } : node
        ),
      };
    }
    const completedSnapshot = inMemoryStore.tasks.find((task) => task.id === taskId) ?? completed;
    inMemoryStore.audit = [
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
      ...inMemoryStore.audit,
    ];
    inMemoryStore.savedTasks = upsertSavedTask(inMemoryStore.savedTasks, { ...completedSnapshot }, "closed");

    inMemoryStore.instances = inMemoryStore.instances.map((instance) => {
      if (instance.id !== completed.instanceId) return instance;
      const nextTask = inMemoryStore.tasks.find((task) => task.instanceId === completed.instanceId && task.status !== "completed");
      return {
        ...instance,
        currentNode: nextTask?.name ?? "Completed",
        status: nextTask ? "active" : "completed",
        patientName: normalizedPatientName || instance.patientName,
        patientId: normalizedPatientId || instance.patientId,
      };
    });

    const taskStatusByNodeId = new Map(
      inMemoryStore.tasks
        .filter((item) => item.instanceId === completed.instanceId && item.nodeId)
        .map((item) => [item.nodeId as string, item.status])
    );
    const runtime = applyRuntimeStateForInstance(inMemoryStore.designerGraph, completed.instanceId, taskStatusByNodeId);
    inMemoryStore.designerGraph = runtime.graph;
    const preferredCurrentNode = getPreferredCurrentNodeForInstance(completed.instanceId);
    inMemoryStore.instances = inMemoryStore.instances.map((instance) =>
      instance.id === completed.instanceId
        ? {
          ...instance,
            currentNode:
              preferredCurrentNode ??
              runtime.activeNodeLabels[0] ??
              "Completed",
            status: (preferredCurrentNode ?? runtime.activeNodeLabels[0]) ? "active" : "completed",
          }
        : instance
    );

    const runtimeAuditEvents = runtime.events.map((event) => ({
      id: `ae-${Date.now()}-${event.nodeId}`,
      instanceId: completed.instanceId,
      timestamp: new Date().toISOString(),
      actor: "Runtime Engine",
      role: completed.role,
      eventType: event.eventType,
      nodeId: event.nodeId,
      nodeName: event.nodeLabel,
      payload: { source: "token_traversal" },
    }));
    if (runtimeAuditEvents.length > 0) {
      inMemoryStore.audit = [...runtimeAuditEvents, ...inMemoryStore.audit];
    }
  }

  return {
    tasks: deepClone(inMemoryStore.tasks),
    savedTasks: deepClone(inMemoryStore.savedTasks),
    audit: deepClone(inMemoryStore.audit),
    graph: completed
      ? projectDesignerGraphByInstance(inMemoryStore.designerGraph, completed.instanceId)
      : deepClone(inMemoryStore.designerGraph),
    instances: deepClone(inMemoryStore.instances),
  };
}

export async function saveTaskEdits(
  taskId: string,
  updates: {
    actor: string;
    formValues: Record<string, string | boolean>;
    triageColor?: TriageColor;
    label?: string;
    patientName?: string;
    patientId?: string;
  }
): Promise<TaskApiResponse> {
  await ensureInitialized();
  await sleep();

  const taskIndex = inMemoryStore.tasks.findIndex((task) => task.id === taskId);
  if (taskIndex < 0) {
    return {
      tasks: deepClone(inMemoryStore.tasks),
      savedTasks: deepClone(inMemoryStore.savedTasks),
      graph: deepClone(inMemoryStore.designerGraph),
      instances: deepClone(inMemoryStore.instances),
      audit: deepClone(inMemoryStore.audit),
    };
  }

  const current = inMemoryStore.tasks[taskIndex];
  const nextTriageColor = updates.triageColor ?? current.triageColor ?? "yellow";
  const nowIso = new Date().toISOString();
  const normalizedPatientName = updates.patientName?.trim();
  const normalizedPatientId = updates.patientId?.trim();
  const normalizedLabel = updates.label?.trim();

  const triageChanged = nextTriageColor !== (current.triageColor ?? "yellow");
  const nextSlaMinutes = triageColorToSlaMinutes(nextTriageColor);
  const nextDueAt = triageChanged ? new Date(Date.now() + nextSlaMinutes * 60 * 1000).toISOString() : current.dueAt;

  const nextTask: Task = {
    ...current,
    formValues: updates.formValues,
    name: normalizedLabel || current.name,
    triageColor: nextTriageColor,
    triageCategory: triageColorToCategory(nextTriageColor),
    priority: triageColorToPriority(nextTriageColor),
    slaMinutes: nextSlaMinutes,
    minutesRemaining: nextSlaMinutes,
    dueAt: nextDueAt,
    patientName: normalizedPatientName || current.patientName,
    patientId: normalizedPatientId || current.patientId,
    updatedAt: nowIso,
  };

  inMemoryStore.tasks = [
    ...inMemoryStore.tasks.slice(0, taskIndex),
    nextTask,
    ...inMemoryStore.tasks.slice(taskIndex + 1),
  ];

  if (nextTask.nodeId) {
    inMemoryStore.designerGraph = {
      ...inMemoryStore.designerGraph,
      nodes: inMemoryStore.designerGraph.nodes.map((node) =>
        node.id === nextTask.nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                label: normalizedLabel || node.data.label,
                triageColor: nextTriageColor,
              },
            }
          : node
      ),
    };
  }

  inMemoryStore.instances = inMemoryStore.instances.map((instance) =>
    instance.id === nextTask.instanceId
      ? {
          ...instance,
          patientName: normalizedPatientName || instance.patientName,
          patientId: normalizedPatientId || instance.patientId,
          priority: triageColorToPriority(nextTriageColor),
        }
      : instance
  );

  inMemoryStore.savedTasks = upsertSavedTask(
    inMemoryStore.savedTasks,
    nextTask,
    nextTask.status === "completed" ? "closed" : "open"
  );

  return {
    tasks: deepClone(inMemoryStore.tasks),
    savedTasks: deepClone(inMemoryStore.savedTasks),
    graph: projectDesignerGraphByInstance(inMemoryStore.designerGraph, nextTask.instanceId),
    instances: deepClone(inMemoryStore.instances),
    audit: deepClone(inMemoryStore.audit),
  };
}

export async function deleteTask(taskId: string): Promise<TaskApiResponse> {
  await ensureInitialized();
  await sleep();

  const task = inMemoryStore.tasks.find((item) => item.id === taskId);
  if (!task) {
    throw new Error("task not found");
  }

  const savedTask = inMemoryStore.savedTasks.find((record) => {
    const id = typeof record.id === "string" ? record.id : "";
    return id === taskId;
  });
  const processStatus =
    typeof savedTask?.processStatus === "string"
      ? savedTask.processStatus.toLowerCase()
      : "open";
  const instance = inMemoryStore.instances.find((item) => item.id === task.instanceId);
  const instanceStatus = (instance?.status ?? "").toLowerCase();

  if (processStatus !== "closed" || instanceStatus !== "completed") {
    throw new Error("task can be deleted only after END is reached and process is closed");
  }

  inMemoryStore.tasks = inMemoryStore.tasks.filter((item) => item.id !== taskId);
  inMemoryStore.savedTasks = inMemoryStore.savedTasks.filter((record) => {
    const id = typeof record.id === "string" ? record.id : "";
    return id !== taskId;
  });

  return {
    tasks: deepClone(inMemoryStore.tasks),
    savedTasks: deepClone(inMemoryStore.savedTasks),
    graph: deepClone(inMemoryStore.designerGraph),
    instances: deepClone(inMemoryStore.instances),
    audit: deepClone(inMemoryStore.audit),
  };
}
