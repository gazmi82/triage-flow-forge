import type { AuditEvent, SavedTaskRecord, Task, TriageColor } from "@/data/contracts";

export type TaskLike = Task | SavedTaskRecord;

export interface ProfileEventBreakdown {
  eventType: AuditEvent["eventType"];
  count: number;
}

export interface ProfileActivityDay {
  key: string;
  label: string;
  count: number;
}

export interface ProfilePatientActivity {
  patientId: string;
  patientName: string;
  instanceId: string;
  latestStatus: TaskLike["status"];
  priority: TaskLike["priority"];
  triageColor?: TriageColor;
  latestTouch: string;
  touchCount: number;
}

export type ProfilePriorityDistribution = Record<TaskLike["priority"], number>;
export type ProfileTriageDistribution = Record<TriageColor, number>;
