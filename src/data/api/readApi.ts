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
} from "@/data/mockData";
import { INITIAL_DESIGNER_GRAPH, buildInstanceDesignerGraph, deepClone } from "@/data/workflowLogic";
import { ensureInitialized, mockStore, sleep } from "@/data/api/state";

export const readApi = {
  async fetchBootstrapData(): Promise<WorkflowBootstrapPayload> {
    await ensureInitialized();
    await sleep();
    return {
      users: deepClone(mockStore.users),
      definitions: deepClone(mockStore.definitions),
      instances: deepClone(mockStore.instances),
      tasks: deepClone(mockStore.tasks),
      savedTasks: deepClone(mockStore.savedTasks),
      audit: deepClone(mockStore.audit),
      graph: deepClone(mockStore.designerGraph),
      drafts: deepClone(mockStore.drafts),
    };
  },

  async fetchUsers(): Promise<User[]> {
    await ensureInitialized();
    await sleep();
    return deepClone(mockStore.users);
  },

  async fetchDefinitions(): Promise<ProcessDefinition[]> {
    await ensureInitialized();
    await sleep();
    return deepClone(mockStore.definitions);
  },

  async fetchInstances(): Promise<ProcessInstance[]> {
    await ensureInitialized();
    await sleep();
    return deepClone(mockStore.instances);
  },

  async fetchTasks(): Promise<Task[]> {
    await ensureInitialized();
    await sleep();
    return deepClone(mockStore.tasks);
  },

  async fetchSavedTasks(): Promise<SavedTaskRecord[]> {
    await ensureInitialized();
    await sleep();
    return deepClone(mockStore.savedTasks);
  },

  async fetchAudit(): Promise<AuditEvent[]> {
    await ensureInitialized();
    await sleep();
    return deepClone(mockStore.audit);
  },

  async fetchDesignerGraph(): Promise<DesignerGraphPayload> {
    await ensureInitialized();
    await sleep();
    return deepClone(mockStore.designerGraph);
  },

  async fetchTaskDesignerGraph(taskId: string): Promise<DesignerGraphPayload> {
    await ensureInitialized();
    await sleep();
    const task = mockStore.savedTasks.find((item) => item.id === taskId) ?? mockStore.tasks.find((item) => item.id === taskId);
    if (!task) {
      return deepClone(INITIAL_DESIGNER_GRAPH);
    }
    const instanceTasks = mockStore.savedTasks.filter((item) => item.instanceId === task.instanceId);
    return buildInstanceDesignerGraph(instanceTasks);
  },

  async fetchDrafts(): Promise<DraftRecord[]> {
    await ensureInitialized();
    await sleep();
    return deepClone(mockStore.drafts);
  },
};
