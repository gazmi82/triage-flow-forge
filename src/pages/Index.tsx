import { MOCK_TASKS, MOCK_INSTANCES, MOCK_DEFINITIONS } from "@/data/mockData";
import { StatusBadge, PriorityBadge, RoleBadge } from "@/components/ui/Badges";
import { slaBg } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  Activity, ClipboardList, GitBranch, AlertTriangle,
  Clock, CheckCircle2, Loader2, TrendingUp, Users
} from "lucide-react";

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className={`rounded-md p-1.5 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const activeTasks = MOCK_TASKS.filter(t => t.status !== "completed");
  const overdueTasks = MOCK_TASKS.filter(t => t.minutesRemaining < 0);
  const activeInstances = MOCK_INSTANCES.filter(i => i.status === "active");
  const criticalTasks = MOCK_TASKS.filter(t => t.priority === "critical");

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Emergency Department · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs font-medium text-success">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          Runtime Engine Online
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Activity} label="Active Instances" value={activeInstances.length} sub={`${MOCK_INSTANCES.length} total today`} color="bg-primary/10 text-primary" />
        <StatCard icon={ClipboardList} label="Open Tasks" value={activeTasks.length} sub="Pending in inbox" color="bg-accent/15 text-accent" />
        <StatCard icon={AlertTriangle} label="SLA Breaches" value={overdueTasks.length} sub="Require immediate attention" color="bg-destructive/10 text-destructive" />
        <StatCard icon={GitBranch} label="Definitions" value={MOCK_DEFINITIONS.filter(d => d.status === "published").length} sub="Published & active" color="bg-node-gateway-and/10 text-node-gateway-and" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Urgent Tasks */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-4 py-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <p className="text-sm font-semibold">Urgent Tasks</p>
            <button onClick={() => navigate("/tasks")} className="ml-auto text-[10px] text-accent hover:underline font-medium">View all →</button>
          </div>
          <div className="divide-y divide-border">
            {MOCK_TASKS.map((task) => (
              <button
                key={task.id}
                onClick={() => navigate("/tasks")}
                className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold">{task.name}</p>
                  <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", slaBg(task.minutesRemaining))}>
                    <Clock className="h-2.5 w-2.5" />
                    {task.minutesRemaining < 0 ? `${Math.abs(task.minutesRemaining)}m overdue` : `${task.minutesRemaining}m left`}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-1.5">{task.patientName} · {task.definitionName}</p>
                <div className="flex gap-1.5 flex-wrap">
                  <PriorityBadge priority={task.priority} />
                  <RoleBadge role={task.role} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Active Instances */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-4 py-3 flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-success animate-spin" />
            <p className="text-sm font-semibold">Active Instances</p>
            <button onClick={() => navigate("/instances")} className="ml-auto text-[10px] text-accent hover:underline font-medium">View all →</button>
          </div>
          <div className="divide-y divide-border">
            {activeInstances.map((inst) => (
              <button
                key={inst.id}
                onClick={() => navigate("/instances")}
                className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold">{inst.patientName}</p>
                  <PriorityBadge priority={inst.priority} />
                </div>
                <p className="text-[10px] text-muted-foreground mb-1">{inst.definitionName}</p>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] text-primary font-medium">
                    {inst.currentNode}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">{inst.id}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Process Definitions summary */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Process Health</p>
        </div>
        <div className="grid grid-cols-4 divide-x divide-border">
          {MOCK_DEFINITIONS.map((def) => (
            <div key={def.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <StatusBadge status={def.status} />
                <span className="text-[10px] font-mono text-muted-foreground">v{def.version}</span>
              </div>
              <p className="text-sm font-semibold leading-tight">{def.name}</p>
              <p className="mt-1 text-lg font-bold">{def.instanceCount}</p>
              <p className="text-[10px] text-muted-foreground">instances total</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
