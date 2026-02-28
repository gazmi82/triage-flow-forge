import type { Role } from "@/data/contracts";

export interface SessionRecord {
  userId: string;
  role: Role;
  issuedAtIso: string;
  expiresAtIso: string;
}

export interface SlaDeadlineEntry {
  taskId: string;
  deadlineEpochSeconds: number;
}

export const redisKeys = {
  session: (userId: string) => `session:${userId}`,
  taskQueue: (role: Role) => `task_queue:${role}`,
  instanceActiveSet: "instance_active_set",
  slaDeadlinesZset: "sla_deadlines_zset",
} as const;
