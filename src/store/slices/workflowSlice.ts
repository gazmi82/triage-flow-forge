import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { appQueryClient } from "@/data/queryClient";
import { mockApi } from "@/data/mockApi";
import {
  type AuditEvent,
  type BpmnNodeType,
  type DraftRecord,
  type DesignerGraphEdge,
  type DesignerGraphNode,
  type DesignerGraphNodeData,
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
  designerNodes: Node<DesignerGraphNodeData>[];
  designerEdges: Edge[];
  drafts: DraftRecord[];
  activeTaskDesignId: string | null;
  isLoading: boolean;
  hasBootstrapped: boolean;
  error: string | null;
}

const toDesignerNodes = (
  nodes: DesignerGraphPayload["nodes"]
): Node<DesignerGraphNodeData>[] =>
  nodes as Node<DesignerGraphNodeData>[];

const toDesignerEdges = (edges: DesignerGraphPayload["edges"]): Edge[] => edges as Edge[];

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

type BootstrapPayload = Awaited<ReturnType<typeof mockApi.fetchBootstrapData>>;
type ClaimTaskPayload = Awaited<ReturnType<typeof mockApi.claimTask>>;
type CompleteTaskPayload = Awaited<ReturnType<typeof mockApi.completeTask>>;
type SaveTaskEditsPayload = Awaited<ReturnType<typeof mockApi.saveTaskEdits>>;
type CreateTaskFromConsoleResult = Awaited<ReturnType<typeof mockApi.createTaskFromConsole>>;
type SaveDraftPayload = Awaited<ReturnType<typeof mockApi.saveDraft>>;
type PublishDesignerPayload = Awaited<ReturnType<typeof mockApi.publishDesignerGraph>>;
type LoadDraftPayload = { draft: DraftRecord };
type OpenTaskDesignerPayload = {
  taskId: string;
  graph: Awaited<ReturnType<typeof mockApi.fetchTaskDesignerGraph>>;
};

export const bootstrapWorkflowThunk = createAsyncThunk<BootstrapPayload>("workflow/bootstrap", async () => {
  return await appQueryClient.fetchQuery({
    queryKey: ["mock-data", "workflow-bootstrap"],
    queryFn: () => mockApi.fetchBootstrapData(),
    staleTime: 5 * 60 * 1000,
  });
});

export const claimTaskThunk = createAsyncThunk<ClaimTaskPayload, { taskId: string; assigneeName: string }>(
  "workflow/claimTask",
  async (payload) => {
    return await mockApi.claimTask(payload.taskId, payload.assigneeName);
  }
);

export const completeTaskThunk = createAsyncThunk<
  CompleteTaskPayload,
  { taskId: string; actor: string; patientName?: string; patientId?: string }
>(
  "workflow/completeTask",
  async (payload) => {
    return await mockApi.completeTask(payload.taskId, payload.actor, payload.patientName, payload.patientId);
  }
);

export const saveTaskEditsThunk = createAsyncThunk<
  SaveTaskEditsPayload,
  {
    taskId: string;
    actor: string;
    formValues: Record<string, string | boolean>;
    triageColor?: Task["triageColor"];
    label?: string;
    patientName?: string;
    patientId?: string;
  }
>("workflow/saveTaskEdits", async (payload) => {
  return await mockApi.saveTaskEdits(payload.taskId, {
    actor: payload.actor,
    formValues: payload.formValues,
    triageColor: payload.triageColor,
    label: payload.label,
    patientName: payload.patientName,
    patientId: payload.patientId,
  });
});

export const createTaskFromConsoleThunk = createAsyncThunk(
  "workflow/createTaskFromConsole",
  async (payload: CreateTaskFromConsolePayload): Promise<CreateTaskFromConsoleResult> => {
    return await mockApi.createTaskFromConsole(payload);
  }
);

export const saveDraftThunk = createAsyncThunk<SaveDraftPayload, void, { state: { workflow: WorkflowState } }>(
  "workflow/saveDraft",
  async (_, { getState }) => {
    const state = getState();
    return await mockApi.saveDraft({
      nodes: state.workflow.designerNodes as unknown as DesignerGraphNode[],
      edges: state.workflow.designerEdges as unknown as DesignerGraphEdge[],
    });
  }
);

export const publishDesignerThunk = createAsyncThunk<
  PublishDesignerPayload,
  void,
  { state: { workflow: WorkflowState } }
>("workflow/publishDesigner", async (_, { getState }) => {
  const state = getState();
  return await mockApi.publishDesignerGraph({
    nodes: state.workflow.designerNodes as unknown as DesignerGraphNode[],
    edges: state.workflow.designerEdges as unknown as DesignerGraphEdge[],
  });
});

export const loadDraftThunk = createAsyncThunk<LoadDraftPayload, { draftId: string }>(
  "workflow/loadDraft",
  async (payload) => {
    const drafts = await mockApi.fetchDrafts();
    const draft = drafts.find((item) => item.id === payload.draftId);
    if (!draft) {
      throw new Error("Draft not found.");
    }
    return { draft };
  }
);

export const openTaskDesignerThunk = createAsyncThunk<OpenTaskDesignerPayload, { taskId: string }>(
  "workflow/openTaskDesigner",
  async (payload) => {
    const graph = await mockApi.fetchTaskDesignerGraph(payload.taskId);
    return { taskId: payload.taskId, graph };
  }
);

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
          type: "sequenceFlow",
          markerEnd: { type: "arrowclosed" },
          style: { stroke: "hsl(220,68%,30%)" },
        },
        state.designerEdges
      );
    },
    addDesignerNode(
      state,
      action: PayloadAction<{ type: BpmnNodeType; label: string; position: { x: number; y: number } }>
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
    updateDesignerNodeType(state, action: PayloadAction<{ id: string; type: BpmnNodeType }>) {
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
        state.designerNodes = toDesignerNodes(action.payload.graph.nodes);
        state.designerEdges = toDesignerEdges(action.payload.graph.edges);
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
        state.designerNodes = toDesignerNodes(action.payload.graph.nodes);
        state.designerEdges = toDesignerEdges(action.payload.graph.edges);
        state.instances = action.payload.instances;
        state.audit = action.payload.audit;
      })
      .addCase(completeTaskThunk.fulfilled, (state, action) => {
        state.tasks = action.payload.tasks;
        state.savedTasks = action.payload.savedTasks;
        state.audit = action.payload.audit;
        state.designerNodes = toDesignerNodes(action.payload.graph.nodes);
        state.designerEdges = toDesignerEdges(action.payload.graph.edges);
        state.instances = action.payload.instances;
      })
      .addCase(saveTaskEditsThunk.fulfilled, (state, action) => {
        state.tasks = action.payload.tasks;
        state.savedTasks = action.payload.savedTasks;
        state.designerNodes = toDesignerNodes(action.payload.graph.nodes);
        state.designerEdges = toDesignerEdges(action.payload.graph.edges);
        state.instances = action.payload.instances;
        state.audit = action.payload.audit;
      })
      .addCase(createTaskFromConsoleThunk.fulfilled, (state, action) => {
        state.tasks = action.payload.tasks;
        state.savedTasks = action.payload.savedTasks;
        state.designerNodes = toDesignerNodes(action.payload.graph.nodes);
        state.designerEdges = toDesignerEdges(action.payload.graph.edges);
        state.instances = action.payload.instances;
        state.audit = action.payload.audit;
      })
      .addCase(saveDraftThunk.fulfilled, (state, action) => {
        state.designerNodes = toDesignerNodes(action.payload.graph.nodes);
        state.designerEdges = toDesignerEdges(action.payload.graph.edges);
        state.drafts = action.payload.drafts;
        state.error = null;
      })
      .addCase(saveDraftThunk.rejected, (state, action) => {
        state.error = action.error.message ?? "Unable to save draft.";
      })
      .addCase(publishDesignerThunk.fulfilled, (state, action) => {
        state.designerNodes = toDesignerNodes(action.payload.graph.nodes);
        state.designerEdges = toDesignerEdges(action.payload.graph.edges);
        state.tasks = action.payload.tasks;
        state.instances = action.payload.instances;
        state.error = null;
      })
      .addCase(publishDesignerThunk.rejected, (state, action) => {
        state.error = action.error.message ?? "Unable to publish process.";
      })
      .addCase(loadDraftThunk.fulfilled, (state, action) => {
        state.designerNodes = toDesignerNodes(action.payload.draft.graph.nodes);
        state.designerEdges = toDesignerEdges(action.payload.draft.graph.edges);
        state.activeTaskDesignId = null;
        state.error = null;
      })
      .addCase(loadDraftThunk.rejected, (state, action) => {
        state.error = action.error.message ?? "Unable to load draft.";
      })
      .addCase(openTaskDesignerThunk.fulfilled, (state, action) => {
        state.designerNodes = toDesignerNodes(action.payload.graph.nodes);
        state.designerEdges = toDesignerEdges(action.payload.graph.edges);
        state.activeTaskDesignId = action.payload.taskId;
        state.error = null;
      })
      .addCase(openTaskDesignerThunk.rejected, (state, action) => {
        state.error = action.error.message ?? "Unable to open designer for task.";
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
