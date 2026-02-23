import { describe, expect, it } from "vitest";
import type { DesignerGraphPayload } from "@/data/mockData";
import { normalizeGraphForBpmnSubset, validateDesignerGraphPayload } from "@/data/bpmnValidation";

const baseGraph: DesignerGraphPayload = {
  nodes: [
    {
      id: "start-1",
      type: "startEvent",
      position: { x: 80, y: 100 },
      data: { label: "Start", eventDefinitionType: "none", gatewayDirection: "unspecified" },
    },
    {
      id: "task-1",
      type: "userTask",
      position: { x: 260, y: 100 },
      data: {
        label: "Registration",
        role: "Reception",
        laneRef: "reception",
        taskStatus: "pending",
        eventDefinitionType: "none",
        gatewayDirection: "unspecified",
      },
    },
    {
      id: "end-1",
      type: "endEvent",
      position: { x: 460, y: 100 },
      data: { label: "End", eventDefinitionType: "none", gatewayDirection: "unspecified" },
    },
  ],
  edges: [
    { id: "e1", source: "start-1", target: "task-1", type: "sequenceFlow" },
    { id: "e2", source: "task-1", target: "end-1", type: "sequenceFlow" },
  ],
};

describe("bpmn validation", () => {
  it("accepts a valid publish graph", () => {
    const result = validateDesignerGraphPayload(baseGraph, "publish");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects publish when start/end are missing", () => {
    const graph: DesignerGraphPayload = {
      nodes: [
        {
          id: "task-only",
          type: "userTask",
          position: { x: 0, y: 0 },
          data: {
            label: "Only Task",
            role: "Reception",
            laneRef: "reception",
            eventDefinitionType: "none",
            gatewayDirection: "unspecified",
          },
        },
      ],
      edges: [],
    };

    const result = validateDesignerGraphPayload(graph, "publish");
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("startEvent"))).toBe(true);
    expect(result.errors.some((error) => error.includes("endEvent"))).toBe(true);
  });

  it("normalizes missing edge type to sequenceFlow", () => {
    const graph: DesignerGraphPayload = {
      ...baseGraph,
      edges: [{ id: "e1", source: "start-1", target: "task-1" }],
    };
    const normalized = normalizeGraphForBpmnSubset(graph);
    expect(normalized.edges[0].type).toBe("sequenceFlow");
  });
});

