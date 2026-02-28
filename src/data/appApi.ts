import { apiClient } from "@/data/apiClient";
import type { CreateTaskFromConsolePayload, Role, TriageColor } from "@/data/contracts";

export const appApi = {
  async fetchBootstrapData() {
    return apiClient.fetchWorkflowBootstrap();
  },

  async login(email: string, password: string) {
    return apiClient.login(email, password);
  },

  async register(payload: { name: string; email: string; password: string; role: Role; department: string }) {
    await apiClient.createUser(payload);
    return apiClient.login(payload.email, payload.password);
  },

  async createUser(payload: Parameters<typeof apiClient.createUser>[0]) {
    return apiClient.createUser(payload);
  },

  async fetchTasks() {
    return apiClient.fetchTasks();
  },

  async fetchTaskDesignerGraph(taskId: string) {
    return apiClient.fetchTaskDesignerGraph(taskId);
  },

  async claimTask(taskId: string, assigneeName: string) {
    return apiClient.claimTask(taskId, assigneeName);
  },

  async deleteTask(taskId: string) {
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
    return apiClient.saveTaskEdits(taskId, updates);
  },

  async completeTask(taskId: string, actor: string, patientName?: string, patientId?: string) {
    return apiClient.completeTask(taskId, actor, patientName, patientId);
  },

  async fetchDrafts() {
    return apiClient.fetchDrafts();
  },

  async saveDraft(payload: Parameters<typeof apiClient.saveDraft>[0]) {
    return apiClient.saveDraft(payload);
  },

  async publishDesignerGraph(payload: Parameters<typeof apiClient.publishDesignerGraph>[0]) {
    return apiClient.publishDesignerGraph(payload);
  },
};
