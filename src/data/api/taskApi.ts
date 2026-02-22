import type { AuditEvent, CreateTaskFromConsolePayload, DesignerGraphPayload, ProcessInstance, SavedTaskRecord, Task } from "@/data/mockData";
import { deepClone, getDefaultAssigneeForRole, getFormFieldsForUserTask, getRoleLabel, upsertSavedTask } from "@/data/workflowLogic";
import { ensureInitialized, mockStore, sleep } from "@/data/api/state";

export const taskApi = {
  async claimTask(taskId: string, assigneeName: string): Promise<{ tasks: Task[]; savedTasks: SavedTaskRecord[]; graph: DesignerGraphPayload; instances: ProcessInstance[]; audit: AuditEvent[] }> {
    await ensureInitialized();
    await sleep();
    const now = new Date().toISOString();
    mockStore.tasks = mockStore.tasks.map((task) => (task.id === taskId ? { ...task, status: "claimed", assignee: assigneeName, updatedAt: now } : task));

    const task = mockStore.tasks.find((item) => item.id === taskId);
    if (task?.nodeId) {
      mockStore.designerGraph = {
        ...mockStore.designerGraph,
        nodes: mockStore.designerGraph.nodes.map((node) =>
          node.id === task.nodeId ? { ...node, data: { ...node.data, taskStatus: "claimed" } } : node
        ),
      };

      mockStore.audit = [
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
        ...mockStore.audit,
      ];

      mockStore.savedTasks = upsertSavedTask(mockStore.savedTasks, task, "open");
    }

    return {
      tasks: deepClone(mockStore.tasks),
      savedTasks: deepClone(mockStore.savedTasks),
      graph: deepClone(mockStore.designerGraph),
      instances: deepClone(mockStore.instances),
      audit: deepClone(mockStore.audit),
    };
  },

  async completeTask(taskId: string, actor: string): Promise<{ tasks: Task[]; savedTasks: SavedTaskRecord[]; audit: AuditEvent[]; graph: DesignerGraphPayload; instances: ProcessInstance[] }> {
    await ensureInitialized();
    await sleep();
    const completed = mockStore.tasks.find((task) => task.id === taskId);

    if (completed) {
      mockStore.tasks = mockStore.tasks.map((task) =>
        task.id === taskId ? { ...task, status: "completed", updatedAt: new Date().toISOString() } : task
      );

      if (completed.nodeId) {
        mockStore.designerGraph = {
          ...mockStore.designerGraph,
          nodes: mockStore.designerGraph.nodes.map((node) =>
            node.id === completed.nodeId ? { ...node, data: { ...node.data, taskStatus: "completed" } } : node
          ),
        };
      }
      mockStore.audit = [
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
        ...mockStore.audit,
      ];
      mockStore.savedTasks = upsertSavedTask(
        mockStore.savedTasks,
        { ...completed, status: "completed", updatedAt: new Date().toISOString() },
        "closed"
      );

      mockStore.instances = mockStore.instances.map((instance) => {
        if (instance.id !== completed.instanceId) return instance;
        const nextTask = mockStore.tasks.find((task) => task.instanceId === completed.instanceId && task.status !== "completed");
        return {
          ...instance,
          currentNode: nextTask?.name ?? "Completed",
          status: nextTask ? "active" : "completed",
        };
      });
    }

    return {
      tasks: deepClone(mockStore.tasks),
      savedTasks: deepClone(mockStore.savedTasks),
      audit: deepClone(mockStore.audit),
      graph: deepClone(mockStore.designerGraph),
      instances: deepClone(mockStore.instances),
    };
  },

  async createTaskFromConsole(payload: CreateTaskFromConsolePayload): Promise<{ tasks: Task[]; savedTasks: SavedTaskRecord[]; graph: DesignerGraphPayload; instances: ProcessInstance[]; audit: AuditEvent[] }> {
    await ensureInitialized();
    await sleep();
    const timestamp = Date.now();
    const instanceId = payload.instanceId && payload.instanceId.trim().length > 0 ? payload.instanceId : `pi-flow-${timestamp}`;
    const newNodeId = `node-${timestamp}`;
    const hasNodes = mockStore.designerGraph.nodes.length > 0;
    const startNode = mockStore.designerGraph.nodes.find((node) => node.type === "startEvent");
    const sourceNodeId = payload.fromNodeId && mockStore.designerGraph.nodes.some((n) => n.id === payload.fromNodeId)
      ? payload.fromNodeId
      : startNode?.id;

    const newNode = {
      id: newNodeId,
      type: payload.nodeType,
      position: {
        x: 220 + mockStore.designerGraph.nodes.length * 90,
        y: 180 + (mockStore.designerGraph.nodes.length % 3) * 80,
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

    mockStore.designerGraph = {
      ...mockStore.designerGraph,
      nodes: [...mockStore.designerGraph.nodes, ...nodesToAdd],
      edges: [...mockStore.designerGraph.edges, ...edgesToAdd],
    };

    if (payload.nodeType === "userTask") {
      const createdAt = new Date().toISOString();
      const dueAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const defaultAssignee = getDefaultAssigneeForRole(mockStore.users, payload.assignedRole);
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

      mockStore.tasks = [createdTask, ...mockStore.tasks];
      mockStore.savedTasks = upsertSavedTask(mockStore.savedTasks, createdTask, "open");

      mockStore.audit = [
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
        ...mockStore.audit,
      ];
    }

    if (!mockStore.instances.some((instance) => instance.id === instanceId)) {
      mockStore.instances = [
        ...mockStore.instances,
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
      mockStore.instances = mockStore.instances.map((instance) =>
        instance.id === instanceId ? { ...instance, currentNode: payload.label } : instance
      );
    }

    return {
      tasks: deepClone(mockStore.tasks),
      savedTasks: deepClone(mockStore.savedTasks),
      graph: deepClone(mockStore.designerGraph),
      instances: deepClone(mockStore.instances),
      audit: deepClone(mockStore.audit),
    };
  },
};
