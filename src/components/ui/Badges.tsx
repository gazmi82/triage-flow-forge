import { cn } from "@/lib/utils";
import type { Role, TriageColor } from "@/data/contracts";
import { ROLE_LABELS, ROLE_COLORS } from "@/data/constants";

interface RoleBadgeProps {
  role: Role;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
      ROLE_COLORS[role],
      className
    )}>
      {ROLE_LABELS[role]}
    </span>
  );
}

type Priority = "low" | "medium" | "high" | "critical";
const PRIORITY_COLORS: Record<Priority, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-info/15 text-info border-info/30",
  high: "bg-warning/15 text-warning border-warning/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
      PRIORITY_COLORS[priority],
      className
    )}>
      {priority}
    </span>
  );
}

type Status = "active" | "completed" | "suspended" | "error" | "pending" | "claimed" | "overdue" | "draft" | "published" | "archived";
const STATUS_COLORS: Record<Status, string> = {
  active: "bg-success/15 text-success border-success/30",
  completed: "bg-muted text-muted-foreground border-border",
  suspended: "bg-warning/15 text-warning border-warning/30",
  error: "bg-destructive/15 text-destructive border-destructive/30",
  pending: "bg-info/15 text-info border-info/30",
  claimed: "bg-accent/15 text-accent border-accent/30",
  overdue: "bg-destructive/15 text-destructive border-destructive/30",
  draft: "bg-muted text-muted-foreground border-border",
  published: "bg-success/15 text-success border-success/30",
  archived: "bg-muted text-muted-foreground border-border",
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
      STATUS_COLORS[status],
      className
    )}>
      {status === "claimed" && (
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
        </span>
      )}
      {status}
    </span>
  );
}

const TRIAGE_COLORS: Record<TriageColor, string> = {
  red: "bg-destructive/20 text-destructive border-destructive/40",
  orange: "bg-warning/20 text-warning border-warning/40",
  yellow: "bg-amber-100 text-amber-800 border-amber-300",
  green: "bg-success/15 text-success border-success/30",
  blue: "bg-info/15 text-info border-info/30",
};

const TRIAGE_LABELS: Record<TriageColor, string> = {
  red: "Immediate",
  orange: "Very urgent",
  yellow: "Urgent",
  green: "Standard",
  blue: "Non-urgent",
};

interface TriageBadgeProps {
  triageColor: TriageColor;
  className?: string;
}

export function TriageBadge({ triageColor, className }: TriageBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
      TRIAGE_COLORS[triageColor],
      className
    )}>
      {TRIAGE_LABELS[triageColor]}
    </span>
  );
}
