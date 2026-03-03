import type { DesignerGraphPayload } from "@/data/contracts";

export type TaskNodeType = DesignerGraphPayload["nodes"][number]["type"];

export const NODE_TYPE_LABELS: Record<TaskNodeType, string> = {
  startEvent: "Start Event",
  endEvent: "End Event",
  timerEvent: "Timer Event",
  messageEvent: "Message Event",
  signalEvent: "Signal Event",
  userTask: "User Task",
  xorGateway: "XOR Gateway",
  andGateway: "AND Gateway",
};

export const getDefaultNodeLabel = (type: TaskNodeType) => NODE_TYPE_LABELS[type];
