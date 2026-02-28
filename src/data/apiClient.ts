import type {
  AdminCreateUserRequest,
  AdminCreateUserResponse,
  AuthPayload,
  AuditEvent,
  CreateTaskFromConsolePayload,
  DesignerGraphPayload,
  ProcessInstance,
  SavedTaskRecord,
  Task,
  TriageColor,
  WorkflowBootstrapPayload,
} from "@/data/mockData";

const normalizeBoolean = (value: string | undefined): boolean => {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

export const useRealApi = normalizeBoolean(import.meta.env.VITE_USE_REAL_API);

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const apiBaseUrl = rawBaseUrl && rawBaseUrl.length > 0 ? rawBaseUrl.replace(/\/+$/, "") : "";

const endpoint = (path: string): string => (apiBaseUrl ? `${apiBaseUrl}${path}` : path);

const parseErrorMessage = async (response: Response): Promise<string> => {
  const fallback = `Request failed: ${response.status}`;
  try {
    const body = (await response.json()) as { error?: string; message?: string };
    return body.error ?? body.message ?? fallback;
  } catch {
    return fallback;
  }
};

export const apiClient = {
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
  ): Promise<{
    tasks: Task[];
    savedTasks: SavedTaskRecord[];
    graph: DesignerGraphPayload;
    instances: ProcessInstance[];
    audit: AuditEvent[];
  }> {
    const path = endpoint(`/api/tasks/${encodeURIComponent(taskId)}`);
    const body = JSON.stringify(updates);
    const methods: Array<"PATCH" | "PUT" | "POST"> = ["PATCH", "PUT", "POST"];
    let lastErrorMessage = "Unable to save task edits.";

    for (const method of methods) {
      const response = await fetch(path, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body,
      });

      if (response.status === 405) {
        lastErrorMessage = await parseErrorMessage(response);
        continue;
      }

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      return (await response.json()) as {
        tasks: Task[];
        savedTasks: SavedTaskRecord[];
        graph: DesignerGraphPayload;
        instances: ProcessInstance[];
        audit: AuditEvent[];
      };
    }

    throw new Error(lastErrorMessage);
  },

  async completeTask(
    taskId: string,
    actor: string,
    patientName?: string,
    patientId?: string
  ): Promise<{
    tasks: Task[];
    savedTasks: SavedTaskRecord[];
    graph: DesignerGraphPayload;
    instances: ProcessInstance[];
    audit: AuditEvent[];
  }> {
    const response = await fetch(endpoint(`/api/tasks/${encodeURIComponent(taskId)}/complete`), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ actor, patientName, patientId }),
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    return (await response.json()) as {
      tasks: Task[];
      savedTasks: SavedTaskRecord[];
      graph: DesignerGraphPayload;
      instances: ProcessInstance[];
      audit: AuditEvent[];
    };
  },

  async deleteTask(taskId: string): Promise<{
    tasks: Task[];
    savedTasks: SavedTaskRecord[];
    graph: DesignerGraphPayload;
    instances: ProcessInstance[];
    audit: AuditEvent[];
  }> {
    const response = await fetch(endpoint(`/api/tasks/${encodeURIComponent(taskId)}`), {
      method: "DELETE",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    return (await response.json()) as {
      tasks: Task[];
      savedTasks: SavedTaskRecord[];
      graph: DesignerGraphPayload;
      instances: ProcessInstance[];
      audit: AuditEvent[];
    };
  },

  async fetchWorkflowBootstrap(): Promise<WorkflowBootstrapPayload> {
    const response = await fetch(endpoint("/api/workflow/bootstrap"), {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    return (await response.json()) as WorkflowBootstrapPayload;
  },

  async login(email: string, password: string): Promise<AuthPayload> {
    const response = await fetch(endpoint("/api/auth/login"), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    return (await response.json()) as AuthPayload;
  },

  async createUser(payload: AdminCreateUserRequest): Promise<AdminCreateUserResponse> {
    const response = await fetch(endpoint("/api/admin/users"), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    return (await response.json()) as AdminCreateUserResponse;
  },

  async fetchTasks(): Promise<Task[]> {
    const response = await fetch(endpoint("/api/tasks"), {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    return (await response.json()) as Task[];
  },

  async claimTask(
    taskId: string,
    assigneeName: string
  ): Promise<{
    tasks: Task[];
    savedTasks: SavedTaskRecord[];
    graph: DesignerGraphPayload;
    instances: ProcessInstance[];
    audit: AuditEvent[];
  }> {
    const response = await fetch(endpoint(`/api/tasks/${encodeURIComponent(taskId)}/claim`), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ assigneeName }),
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    return (await response.json()) as {
      tasks: Task[];
      savedTasks: SavedTaskRecord[];
      graph: DesignerGraphPayload;
      instances: ProcessInstance[];
      audit: AuditEvent[];
    };
  },

  async createTaskFromConsole(payload: CreateTaskFromConsolePayload): Promise<{
    tasks: Task[];
    savedTasks: SavedTaskRecord[];
    graph: DesignerGraphPayload;
    instances: ProcessInstance[];
    audit: AuditEvent[];
    createdNodeId: string;
    instanceId: string;
  }> {
    const response = await fetch(endpoint("/api/tasks/create-from-console"), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    return (await response.json()) as {
      tasks: Task[];
      savedTasks: SavedTaskRecord[];
      graph: DesignerGraphPayload;
      instances: ProcessInstance[];
      audit: AuditEvent[];
      createdNodeId: string;
      instanceId: string;
    };
  },

  async fetchTaskDesignerGraph(taskId: string): Promise<DesignerGraphPayload> {
    const response = await fetch(endpoint(`/api/tasks/${encodeURIComponent(taskId)}/designer`), {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    return (await response.json()) as DesignerGraphPayload;
  },
};
