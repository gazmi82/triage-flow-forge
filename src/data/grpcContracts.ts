import type { GrpcTaskMutationRequest, GrpcTaskMutationResponse, GrpcWorkflowEnvelope } from "@/data/mockData";

export const grpcMethods = {
  claimTask: "workflow.TaskService/ClaimTask",
  completeTask: "workflow.TaskService/CompleteTask",
  createTask: "workflow.TaskService/CreateTask",
} as const;

export const toGrpcEnvelope = <T>(method: string, payload: T): GrpcWorkflowEnvelope<T> => ({
  method,
  traceId: `trace-${Date.now()}`,
  timestamp: new Date().toISOString(),
  payload,
});

export const mapGrpcTaskMutationResponse = (message: string): GrpcTaskMutationResponse => ({
  ok: true,
  message,
});

export type GrpcTaskRequest = GrpcTaskMutationRequest;
