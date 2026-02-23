import { Activity, AlertTriangle, CheckCircle2, ChevronRight, Clock, Milestone, User } from "lucide-react";
import type { ReactNode } from "react";
import { RoleBadge } from "@/components/ui";
import { formatTime } from "@/lib";
import type { AuditEvent } from "@/data/mockData";

export function AuditTimeline({ instanceId, events }: { instanceId: string; events: AuditEvent[] }) {
  const instanceEvents = [...events.filter((e) => e.instanceId === instanceId)].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const iconMap: Record<string, ReactNode> = {
    instance_started: <Activity className="h-3.5 w-3.5 text-success" />,
    task_created: <Milestone className="h-3.5 w-3.5 text-info" />,
    task_claimed: <User className="h-3.5 w-3.5 text-accent" />,
    task_completed: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
    timer_fired: <Clock className="h-3.5 w-3.5 text-warning" />,
    message_received: <Milestone className="h-3.5 w-3.5 text-node-message" />,
    gateway_passed: <ChevronRight className="h-3.5 w-3.5 text-node-gateway-xor" />,
    signal_received: <AlertTriangle className="h-3.5 w-3.5 text-node-message" />,
  };

  return (
    <div className="space-y-2">
      {instanceEvents.map((ev, i) => (
        <div key={ev.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="relative flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted">
              {i === 0 && (
                <>
                  <span className="absolute inline-flex h-5 w-5 animate-ping rounded-full bg-success/35" />
                  <span className="absolute h-2 w-2 rounded-full bg-success" />
                </>
              )}
              {iconMap[ev.eventType] || <Milestone className="h-3.5 w-3.5" />}
            </div>
            {i < instanceEvents.length - 1 && <div className="mt-1 w-px flex-1 bg-border" style={{ minHeight: "16px" }} />}
          </div>
          <div className="min-w-0 pb-3">
            <p className="text-xs font-medium capitalize leading-tight">{ev.eventType.replace(/_/g, " ")}</p>
            <p className="text-[10px] text-muted-foreground">
              {ev.nodeName} · {ev.actor} · <RoleBadge role={ev.role} className="px-1.5 py-0 text-[9px]" />
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/60">{formatTime(ev.timestamp)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
