import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange } from "@xyflow/react";
import {
  mockApi,
  type AuditEvent,
  type DraftRecord,
  type DesignerGraphPayload,
  type CreateTaskFromConsolePayload,
  type ProcessDefinition,
  type ProcessInstance,
  type SavedTaskRecord,
  type Task,
  type User,
} from "@/data/mockData";

interface WorkflowState {
  users: User[];
  definitions: ProcessDefinition[];
  instances: ProcessInstance[];
  tasks: Task[];
  savedTasks: SavedTaskRecord[];
  audit: AuditEvent[];
  designerNodes: DesignerGraphPayload["nodes"];
  designerEdges: DesignerGraphPayload["edges"];
  drafts: DraftRecord[];
  activeTaskDesignId: string | null;
  isLoading: boolean;
  hasBootstrapped: boolean;
  error: string | null;
}

const initialState: WorkflowState = {
  users: [],
  definitions: [],
  instances: [],
  tasks: [],
  savedTasks: [],
  audit: [],
  designerNodes: [],
  designerEdges: [],
  drafts: [],
  activeTaskDesignId: null,
  isLoading: false,
  hasBootstrapped: false,
  error: null,
};

export const bootstrapWorkflowThunk = createAsyncThunk("workflow/bootstrap", async () => {
  const [users, definitions, instances, tasks, savedTasks, audit, graph] = await Promise.all([
    mockApi.fetchUsers(),
    mockApi.fetchDefinitions(),
    mockApi.fetchInstances(),
    mockApi.fetchTasks(),
    mockApi.fetchSavedTasks(),
    mockApi.fetchAudit(),
    mockApi.fetchDesignerGraph(),
  ]);
  const drafts = await mockApi.fetchDrafts();
  return { users, definitions, instances, tasks, savedTasks, audit, graph, drafts };
});

export const claimTaskThunk = createAsyncThunk("workflow/claimTask", async (payload: { taskId: string; assigneeName: string }) => {
  return await mockApi.claimTask(payload.taskId, payload.assigneeName);
});

export const completeTaskThunk = createAsyncThunk("workflow/completeTask", async (payload: { taskId: string; actor: string }) => {
  return await mockApi.completeTask(payload.taskId, payload.actor);
});

export const createTaskFromConsoleThunk = createAsyncThunk(
  "workflow/createTaskFromConsole",
  async (payload: CreateTaskFromConsolePayload) => {
    return await mockApi.createTaskFromConsole(payload);
  }
);

export const saveDraftThunk = createAsyncThunk("workflow/saveDraft", async (_, { getState }) => {
  const state = getState() as { workflow: WorkflowState };
  return await mockApi.saveDraft({
    nodes: state.workflow.designerNodes,
    edges: state.workflow.designerEdges,
  });
});

export const publishDesignerThunk = createAsyncThunk("workflow/publishDesigner", async (_, { getState }) => {
  const state = getState() as { workflow: WorkflowState };
  return await mockApi.publishDesignerGraph({
    nodes: state.workflow.designerNodes,
    edges: state.workflow.designerEdges,
  });
});

export const loadDraftThunk = createAsyncThunk("workflow/loadDraft", async (payload: { draftId: string }) => {
  const drafts = await mockApi.fetchDrafts();
  const draft = drafts.find((item) => item.id === payload.draftId);
  if (!draft) {
    throw new Error("Draft not found.");
  }
  return { draft };
});

export const openTaskDesignerThunk = createAsyncThunk("workflow/openTaskDesigner", async (payload: { taskId: string }) => {
  const graph = await mockApi.fetchTaskDesignerGraph(payload.taskId);
  return { taskId: payload.taskId, graph };
});

const workflowSlice = createSlice({
  name: "workflow",
  initialState,
  reducers: {
    setWorkflowError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    applyDesignerNodeChanges(state, action: PayloadAction<NodeChange[]>) {
      state.designerNodes = applyNodeChanges(action.payload, state.designerNodes);
    },
    applyDesignerEdgeChanges(state, action: PayloadAction<EdgeChange[]>) {
      state.designerEdges = applyEdgeChanges(action.payload, state.designerEdges);
    },
    addDesignerEdge(state, action: PayloadAction<Connection>) {
      state.designerEdges = addEdge(
        {
          ...action.payload,
          markerEnd: { type: "arrowclosed" },
          style: { stroke: "hsl(220,68%,30%)" },
        },
        state.designerEdges
      );
    },
    addDesignerNode(
      state,
      action: PayloadAction<{ type: string; label: string; position: { x: number; y: number } }>
    ) {
      state.designerNodes.push({
        id: `node_${Date.now()}`,
        type: action.payload.type,
        position: action.payload.position,
        data: { label: action.payload.label },
      });
    },
    updateDesignerNodeLabel(state, action: PayloadAction<{ id: string; label: string }>) {
      state.designerNodes = state.designerNodes.map((node) =>
        node.id === action.payload.id ? { ...node, data: { ...node.data, label: action.payload.label } } : node
      );
    },
    updateDesignerNodeRole(state, action: PayloadAction<{ id: string; role: string }>) {
      state.designerNodes = state.designerNodes.map((node) =>
        node.id === action.payload.id ? { ...node, data: { ...node.data, role: action.payload.role } } : node
      );
    },
    updateDesignerNodeType(state, action: PayloadAction<{ id: string; type: string }>) {
      state.designerNodes = state.designerNodes.map((node) =>
        node.id === action.payload.id ? { ...node, type: action.payload.type } : node
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapWorkflowThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(bootstrapWorkflowThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.hasBootstrapped = true;
        state.users = action.payload.users;
        state.definitions = action.payload.definitions;
        state.instances = action.payload.instances;
        state.tasks = action.payload.tasks;
        state.savedTasks = action.payload.savedTasks;
        state.audit = action.payload.audit;
        state.designerNodes = action.payload.graph.nodes;
        state.designerEdges = action.payload.graph.edges;
        state.drafts = action.payload.drafts;
      })
      .addCase(bootstrapWorkflowThunk.rejected, (state) => {
        state.isLoading = false;
        state.hasBootstrapped = true;
        state.error = "Unable to load workflow data.";
      })
      .addCase(claimTaskThunk.fulfilled, (state, action) => {
        state.tasks = action.payload.tasks;
        state.savedTasks = action.payload.savedTasks;
        state.designerNodes = action.payload.graph.nodes;
        state.designerEdges = action.payload.graph.edges;
        state.instances = action.payload.instances;
        state.audit = action.payload.audit;
      })
      .addCase(completeTaskThunk.fulfilled, (state, action) => {
        state.tasks = action.payload.tasks;
        state.savedTasks = action.payload.savedTasks;
        state.audit = action.payload.audit;
        state.designerNodes = action.payload.graph.nodes;
        state.designerEdges = action.payload.graph.edges;
        state.instances = action.payload.instances;
      })
      .addCase(createTaskFromConsoleThunk.fulfilled, (state, action) => {
        state.tasks = action.payload.tasks;
        state.savedTasks = action.payload.savedTasks;
        state.designerNodes = action.payload.graph.nodes;
        state.designerEdges = action.payload.graph.edges;
        state.instances = action.payload.instances;
        state.audit = action.payload.audit;
      })
      .addCase(saveDraftThunk.fulfilled, (state, action) => {
        state.designerNodes = action.payload.graph.nodes;
        state.designerEdges = action.payload.graph.edges;
        state.drafts = action.payload.drafts;
      })
      .addCase(publishDesignerThunk.fulfilled, (state, action) => {
        state.designerNodes = action.payload.graph.nodes;
        state.designerEdges = action.payload.graph.edges;
        state.tasks = action.payload.tasks;
        state.instances = action.payload.instances;
      })
      .addCase(loadDraftThunk.fulfilled, (state, action) => {
        state.designerNodes = action.payload.draft.graph.nodes;
        state.designerEdges = action.payload.draft.graph.edges;
        state.activeTaskDesignId = null;
      })
      .addCase(openTaskDesignerThunk.fulfilled, (state, action) => {
        state.designerNodes = action.payload.graph.nodes;
        state.designerEdges = action.payload.graph.edges;
        state.activeTaskDesignId = action.payload.taskId;
      });
  },
});

export const {
  setWorkflowError,
  applyDesignerNodeChanges,
  applyDesignerEdgeChanges,
  addDesignerEdge,
  addDesignerNode,
  updateDesignerNodeLabel,
  updateDesignerNodeRole,
  updateDesignerNodeType,
} = workflowSlice.actions;

export default workflowSlice.reducer;
