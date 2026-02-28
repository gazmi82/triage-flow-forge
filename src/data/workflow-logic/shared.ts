import type { DesignerGraphPayload } from "@/data/contracts";

export const INITIAL_DESIGNER_GRAPH: DesignerGraphPayload = {
  nodes: [],
  edges: [],
};

export const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
