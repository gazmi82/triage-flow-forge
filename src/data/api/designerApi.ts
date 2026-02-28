import type { DesignerGraphPayload, DraftRecord, ProcessInstance, Task } from "@/data/contracts";
import { deepClone, mergeDesignerGraphByInstances, projectDesignerGraphByInstance } from "@/data/workflowLogic";
import { normalizeGraphForBpmnSubset, validateDesignerGraphPayload } from "@/data/bpmnValidation";
import { ensureInitialized, inMemoryStore, sleep, syncEmergencyTriageTasksFromDesigner } from "@/data/api/state";

export const designerApi = {
  async saveDraft(payload: DesignerGraphPayload): Promise<{ graph: DesignerGraphPayload; drafts: DraftRecord[] }> {
    await ensureInitialized();
    await sleep();
    const normalizedPayload = normalizeGraphForBpmnSubset(payload);
    const validation = validateDesignerGraphPayload(normalizedPayload, "draft");
    if (!validation.valid) {
      throw new Error(`Draft validation failed: ${validation.errors.join(" ")}`);
    }

    inMemoryStore.designerGraph = mergeDesignerGraphByInstances(inMemoryStore.designerGraph, normalizedPayload);
    const nextVersion = inMemoryStore.drafts.length + 1;
    const draft: DraftRecord = {
      id: `draft-${Date.now()}`,
      name: "Emergency Triage",
      version: nextVersion,
      savedAt: new Date().toISOString(),
      graph: deepClone(normalizedPayload),
    };
    inMemoryStore.drafts = [draft, ...inMemoryStore.drafts];
    return { graph: deepClone(normalizedPayload), drafts: deepClone(inMemoryStore.drafts) };
  },

  async publishDesignerGraph(payload: DesignerGraphPayload): Promise<{ graph: DesignerGraphPayload; tasks: Task[]; instances: ProcessInstance[] }> {
    await ensureInitialized();
    await sleep();
    const normalizedPayload = normalizeGraphForBpmnSubset(payload);
    const validation = validateDesignerGraphPayload(normalizedPayload, "publish");
    if (!validation.valid) {
      throw new Error(`Publish validation failed: ${validation.errors.join(" ")}`);
    }

    inMemoryStore.designerGraph = mergeDesignerGraphByInstances(inMemoryStore.designerGraph, normalizedPayload);
    syncEmergencyTriageTasksFromDesigner();
    const instanceId = normalizedPayload.nodes.find((node) => typeof node.data.instanceId === "string")?.data.instanceId;
    const graphForUi = instanceId ? projectDesignerGraphByInstance(inMemoryStore.designerGraph, instanceId) : deepClone(normalizedPayload);
    return {
      graph: graphForUi,
      tasks: deepClone(inMemoryStore.tasks),
      instances: deepClone(inMemoryStore.instances),
    };
  },
};
