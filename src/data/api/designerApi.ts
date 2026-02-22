import type { DesignerGraphPayload, DraftRecord, ProcessInstance, Task } from "@/data/mockData";
import { deepClone } from "@/data/workflowLogic";
import { ensureInitialized, mockStore, sleep, syncEmergencyTriageTasksFromDesigner } from "@/data/api/state";

export const designerApi = {
  async saveDraft(payload: DesignerGraphPayload): Promise<{ graph: DesignerGraphPayload; drafts: DraftRecord[] }> {
    await ensureInitialized();
    await sleep();
    mockStore.designerGraph = deepClone(payload);
    const nextVersion = mockStore.drafts.length + 1;
    const draft: DraftRecord = {
      id: `draft-${Date.now()}`,
      name: "Emergency Triage",
      version: nextVersion,
      savedAt: new Date().toISOString(),
      graph: deepClone(payload),
    };
    mockStore.drafts = [draft, ...mockStore.drafts];
    return { graph: deepClone(mockStore.designerGraph), drafts: deepClone(mockStore.drafts) };
  },

  async publishDesignerGraph(payload: DesignerGraphPayload): Promise<{ graph: DesignerGraphPayload; tasks: Task[]; instances: ProcessInstance[] }> {
    await ensureInitialized();
    await sleep();
    mockStore.designerGraph = deepClone(payload);
    syncEmergencyTriageTasksFromDesigner();
    return {
      graph: deepClone(mockStore.designerGraph),
      tasks: deepClone(mockStore.tasks),
      instances: deepClone(mockStore.instances),
    };
  },
};
