import { apiClient, useRealApi } from "@/data/apiClient";
import { mockApi } from "@/data/mockApi";
import type { CreateTaskFromConsolePayload, TriageColor } from "@/data/mockData";

export const appApi = {
  ...mockApi,

  async fetchBootstrapData() {
    if (!useRealApi) {
      return mockApi.fetchBootstrapData();
    }
    return apiClient.fetchWorkflowBootstrap();
  },

  async login(email: string, password: string) {
    if (!useRealApi) {
      return mockApi.login(email, password);
    }
    return apiClient.login(email, password);
  },

  async createUser(payload: Parameters<typeof mockApi.createUser>[0]) {
    if (!useRealApi) {
      return mockApi.createUser(payload);
    }
    return apiClient.createUser(payload);
  },

  async fetchTasks() {
    if (!useRealApi) {
      return mockApi.fetchTasks();
    }
    return apiClient.fetchTasks();
  },

  async fetchTaskDesignerGraph(taskId: string) {
    if (!useRealApi) {
      return mockApi.fetchTaskDesignerGraph(taskId);
    }
    return apiClient.fetchTaskDesignerGraph(taskId);
  },

  async claimTask(taskId: string, assigneeName: string) {
    if (!useRealApi) {
      return mockApi.claimTask(taskId, assigneeName);
    }
    return apiClient.claimTask(taskId, assigneeName);
  },

  async deleteTask(taskId: string) {
    if (!useRealApi) {
      return mockApi.deleteTask(taskId);
    }
    return apiClient.deleteTask(taskId);
  },

  async createTaskFromConsole(payload: CreateTaskFromConsolePayload) {
    return apiClient.createTaskFromConsole(payload);
  },

  async saveTaskEdits(
    taskId: string,
    updates: {
      actor: string;
      formValues: Record<string, string | boolean>;
      triageColor?: TriageColor;
      label?: string;
      patientName?: string;
      patientId?: string;
    }
  ) {
    if (!useRealApi) {
      return mockApi.saveTaskEdits(taskId, updates);
    }
    return apiClient.saveTaskEdits(taskId, updates);
  },

  async completeTask(taskId: string, actor: string, patientName?: string, patientId?: string) {
    if (!useRealApi) {
      return mockApi.completeTask(taskId, actor, patientName, patientId);
    }
    return apiClient.completeTask(taskId, actor, patientName, patientId);
  },
};
