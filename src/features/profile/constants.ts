import { type ComponentType } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Flag,
  ListChecks,
  Milestone,
  UserRound,
} from "lucide-react";
import type { AuditEvent, TriageColor } from "@/data/contracts";
import type { TaskLike } from "@/features/profile/types";

export const EVENT_LABELS: Record<AuditEvent["eventType"], string> = {
  instance_started: "Instance started",
  task_created: "Task created",
  task_claimed: "Task claimed",
  task_completed: "Task completed",
  timer_fired: "Timer fired",
  message_received: "Message received",
  signal_received: "Signal received",
  gateway_passed: "Gateway passed",
};

export const EVENT_ICONS: Record<AuditEvent["eventType"], ComponentType<{ className?: string }>> = {
  instance_started: Activity,
  task_created: Milestone,
  task_claimed: UserRound,
  task_completed: CheckCircle2,
  timer_fired: Clock3,
  message_received: Flag,
  signal_received: AlertTriangle,
  gateway_passed: ListChecks,
};

export const PRIORITIES: Array<TaskLike["priority"]> = ["low", "medium", "high", "critical"];
export const TRIAGE_COLORS: TriageColor[] = ["red", "orange", "yellow", "green", "blue"];
