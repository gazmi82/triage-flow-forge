import type { BpmnEdgeType, BpmnNodeType, Role } from "@/data/contracts";

export const ROLE_LABELS: Record<Role, string> = {
  reception: "Reception",
  triage_nurse: "Triage Nurse",
  physician: "Physician",
  lab: "Laboratory",
  radiology: "Radiology",
  admin: "Administrator",
};

export const ROLE_COLORS: Record<Role, string> = {
  reception: "bg-info/15 text-info border-info/30",
  triage_nurse: "bg-accent/15 text-accent border-accent/30",
  physician: "bg-primary/10 text-primary border-primary/30",
  lab: "bg-warning/15 text-warning border-warning/30",
  radiology: "bg-node-gateway-and/10 text-node-gateway-and border-node-gateway-and/20",
  admin: "bg-muted text-muted-foreground border-border",
};

export const BPMN_SUPPORTED_NODE_TYPES: readonly BpmnNodeType[] = [
  "startEvent",
  "endEvent",
  "userTask",
  "xorGateway",
  "andGateway",
  "timerEvent",
  "messageEvent",
  "signalEvent",
] as const;

export const BPMN_SUPPORTED_EDGE_TYPES: readonly BpmnEdgeType[] = ["sequenceFlow"] as const;
