import type { DesignerGraphPayload, DraftRecord, ProcessInstance, Task } from "@/data/mockData";
import { deepClone, mergeDesignerGraphByInstances, projectDesignerGraphByInstance } from "@/data/workflowLogic";
import { normalizeGraphForBpmnSubset, validateDesignerGraphPayload } from "@/data/bpmnValidation";
import { ensureInitialized, mockStore, sleep, syncEmergencyTriageTasksFromDesigner } from "@/data/api/state";

export const designerApi = {
  async saveDraft(payload: DesignerGraphPayload): Promise<{ graph: DesignerGraphPayload; drafts: DraftRecord[] }> {
    await ensureInitialized();
    await sleep();
    const normalizedPayload = normalizeGraphForBpmnSubset(payload);
    const validation = validateDesignerGraphPayload(normalizedPayload, "draft");
    if (!validation.valid) {
      throw new Error(`Draft validation failed: ${validation.errors.join(" ")}`);
    }

    mockStore.designerGraph = mergeDesignerGraphByInstances(mockStore.designerGraph, normalizedPayload);
    const nextVersion = mockStore.drafts.length + 1;
    const draft: DraftRecord = {
      id: `draft-${Date.now()}`,
      name: "Emergency Triage",
      version: nextVersion,
      savedAt: new Date().toISOString(),
      graph: deepClone(normalizedPayload),
    };
    mockStore.drafts = [draft, ...mockStore.drafts];
    return { graph: deepClone(normalizedPayload), drafts: deepClone(mockStore.drafts) };
  },

  async publishDesignerGraph(payload: DesignerGraphPayload): Promise<{ graph: DesignerGraphPayload; tasks: Task[]; instances: ProcessInstance[] }> {
    await ensureInitialized();
    await sleep();
    const normalizedPayload = normalizeGraphForBpmnSubset(payload);
    const validation = validateDesignerGraphPayload(normalizedPayload, "publish");
    if (!validation.valid) {
      throw new Error(`Publish validation failed: ${validation.errors.join(" ")}`);
    }

    mockStore.designerGraph = mergeDesignerGraphByInstances(mockStore.designerGraph, normalizedPayload);
    syncEmergencyTriageTasksFromDesigner();
    const instanceId = normalizedPayload.nodes.find((node) => typeof node.data.instanceId === "string")?.data.instanceId;
    const graphForUi = instanceId ? projectDesignerGraphByInstance(mockStore.designerGraph, instanceId) : deepClone(normalizedPayload);
    return {
      graph: graphForUi,
      tasks: deepClone(mockStore.tasks),
      instances: deepClone(mockStore.instances),
    };
  },
};
