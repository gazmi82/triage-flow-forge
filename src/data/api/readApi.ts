import type {
  AuditEvent,
  DesignerGraphPayload,
  DraftRecord,
  ProcessDefinition,
  ProcessInstance,
  SavedTaskRecord,
  Task,
  User,
  WorkflowBootstrapPayload,
} from "@/data/contracts";
import {
  INITIAL_DESIGNER_GRAPH,
  buildInstanceDesignerGraph,
  deepClone,
  projectDesignerGraphByInstance,
} from "@/data/workflowLogic";
import { ensureInitialized, inMemoryStore, sleep } from "@/data/api/state";

export const readApi = {
  async fetchBootstrapData(): Promise<WorkflowBootstrapPayload> {
    await ensureInitialized();
    await sleep();
    return {
      users: deepClone(inMemoryStore.users),
      definitions: deepClone(inMemoryStore.definitions),
      instances: deepClone(inMemoryStore.instances),
      tasks: deepClone(inMemoryStore.tasks),
      savedTasks: deepClone(inMemoryStore.savedTasks),
      audit: deepClone(inMemoryStore.audit),
      graph: deepClone(inMemoryStore.designerGraph),
      drafts: deepClone(inMemoryStore.drafts),
    };
  },

  async fetchUsers(): Promise<User[]> {
    await ensureInitialized();
    await sleep();
    return deepClone(inMemoryStore.users);
  },

  async fetchDefinitions(): Promise<ProcessDefinition[]> {
    await ensureInitialized();
    await sleep();
    return deepClone(inMemoryStore.definitions);
  },

  async fetchInstances(): Promise<ProcessInstance[]> {
    await ensureInitialized();
    await sleep();
    return deepClone(inMemoryStore.instances);
  },

  async fetchTasks(): Promise<Task[]> {
    await ensureInitialized();
    await sleep();
    return deepClone(inMemoryStore.tasks);
  },

  async fetchSavedTasks(): Promise<SavedTaskRecord[]> {
    await ensureInitialized();
    await sleep();
    return deepClone(inMemoryStore.savedTasks);
  },

  async fetchAudit(): Promise<AuditEvent[]> {
    await ensureInitialized();
    await sleep();
    return deepClone(inMemoryStore.audit);
  },

  async fetchDesignerGraph(): Promise<DesignerGraphPayload> {
    await ensureInitialized();
    await sleep();
    return deepClone(inMemoryStore.designerGraph);
  },

  async fetchTaskDesignerGraph(taskId: string): Promise<DesignerGraphPayload> {
    await ensureInitialized();
    await sleep();
    const task = inMemoryStore.savedTasks.find((item) => item.id === taskId) ?? inMemoryStore.tasks.find((item) => item.id === taskId);
    if (!task) {
      return deepClone(INITIAL_DESIGNER_GRAPH);
    }
    const projected = projectDesignerGraphByInstance(inMemoryStore.designerGraph, task.instanceId);
    if (projected.nodes.length > 0) {
      return projected;
    }
    const instanceTasks = inMemoryStore.savedTasks.filter((item) => item.instanceId === task.instanceId);
    return buildInstanceDesignerGraph(instanceTasks);
  },

  async fetchDrafts(): Promise<DraftRecord[]> {
    await ensureInitialized();
    await sleep();
    return deepClone(inMemoryStore.drafts);
  },
};
