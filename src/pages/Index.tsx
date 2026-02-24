import { StatusBadge, PriorityBadge, RoleBadge, TriageBadge } from "@/components/ui/Badges";
import { minutesUntilDue, slaBg } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { bootstrapWorkflowThunk } from "@/store/slices/workflowSlice";
import { useAuth } from "@/hooks";
import {
  Activity, ClipboardList, GitBranch, AlertTriangle,
  Clock, Loader2, TrendingUp
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
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const tasks = useAppSelector((state) => state.workflow.tasks);
  const instances = useAppSelector((state) => state.workflow.instances);
  const definitions = useAppSelector((state) => state.workflow.definitions);
  const hasBootstrapped = useAppSelector((state) => state.workflow.hasBootstrapped);
  const isLoading = useAppSelector((state) => state.workflow.isLoading);
  const error = useAppSelector((state) => state.workflow.error);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const activeTasks = tasks.filter((t) => t.status !== "completed");
  const overdueTasks = tasks.filter((t) => minutesUntilDue(t.dueAt, nowMs) < 0);
  const activeInstances = useMemo(() => {
    const openTasksByInstanceId = activeTasks.reduce<Map<string, typeof activeTasks>>((acc, task) => {
      const bucket = acc.get(task.instanceId) ?? [];
      bucket.push(task);
      acc.set(task.instanceId, bucket);
      return acc;
    }, new Map());

    return Array.from(openTasksByInstanceId.entries()).map(([instanceId, instanceTasks]) => {
      const base = instances.find((instance) => instance.id === instanceId);
      const prioritized = [...instanceTasks].sort((a, b) => {
        const taskScore = (status: typeof a.status) => (status === "claimed" ? 0 : status === "overdue" ? 1 : 2);
        const scoreDiff = taskScore(a.status) - taskScore(b.status);
        if (scoreDiff !== 0) return scoreDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      })[0];

      return {
        id: instanceId,
        definitionName: base?.definitionName ?? prioritized.definitionName,
        patientName: base?.patientName ?? prioritized.patientName,
        priority: base?.priority ?? prioritized.priority,
        currentNode: prioritized.name,
      };
    });
  }, [activeTasks, instances]);
  const urgentTasks = [...activeTasks]
    .sort((a, b) => minutesUntilDue(a.dueAt, nowMs) - minutesUntilDue(b.dueAt, nowMs))
    .slice(0, 5);

  useEffect(() => {
    if (!hasBootstrapped && !isLoading) {
      dispatch(bootstrapWorkflowThunk());
    }
  }, [dispatch, hasBootstrapped, isLoading]);

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const definitionInstanceCounts = useMemo(() => {
    return instances.reduce<Record<string, number>>((acc, instance) => {
      acc[instance.definitionId] = (acc[instance.definitionId] ?? 0) + 1;
      return acc;
    }, {});
  }, [instances]);

  const engineStatus = useMemo(() => {
    if (isLoading) return { label: "Syncing Runtime Data", classes: "border-info/30 bg-info/10 text-info", pulse: "bg-info" };
    if (error) return { label: "Runtime Data Error", classes: "border-destructive/30 bg-destructive/10 text-destructive", pulse: "bg-destructive" };
    return { label: "Runtime Engine Online", classes: "border-success/30 bg-success/10 text-success", pulse: "bg-success" };
  }, [error, isLoading]);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {user?.department ?? "Operations"} Department · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium", engineStatus.classes)}>
          <div className={cn("h-2 w-2 rounded-full animate-pulse", engineStatus.pulse)} />
          {engineStatus.label}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <StatCard icon={Activity} label="Active Instances" value={activeInstances.length} sub={`${instances.length} tracked total`} color="bg-primary/10 text-primary" />
        <StatCard icon={ClipboardList} label="Open Tasks" value={activeTasks.length} sub="Pending in inbox" color="bg-accent/15 text-accent" />
        <StatCard icon={AlertTriangle} label="SLA Breaches" value={overdueTasks.length} sub="Require immediate attention" color="bg-destructive/10 text-destructive" />
        <StatCard icon={GitBranch} label="Definitions" value={definitions.filter(d => d.status === "published").length} sub="Published & active" color="bg-node-gateway-and/10 text-node-gateway-and" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Urgent Tasks */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-4 py-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <p className="text-sm font-semibold">Urgent Tasks</p>
            <button onClick={() => navigate("/tasks")} className="ml-auto text-[10px] text-accent hover:underline font-medium">View all →</button>
          </div>
          <div className="divide-y divide-border">
            {urgentTasks.length === 0 ? (
              <div className="px-4 py-6 text-xs text-muted-foreground">No urgent tasks in queue.</div>
            ) : urgentTasks.map((task) => {
              const remaining = minutesUntilDue(task.dueAt, nowMs);
              return (
              <button
                key={task.id}
                onClick={() => navigate("/tasks")}
                className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold">{task.name}</p>
                  <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", slaBg(remaining))}>
                    <Clock className="h-2.5 w-2.5" />
                    {remaining < 0 ? `${Math.abs(remaining)}m overdue` : `${remaining}m left`}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-1.5">{task.patientName} · {task.definitionName}</p>
                <div className="flex gap-1.5 flex-wrap">
                  <PriorityBadge priority={task.priority} />
                  {task.triageColor ? <TriageBadge triageColor={task.triageColor} /> : null}
                  <RoleBadge role={task.role} />
                </div>
              </button>
              );
            })}
          </div>
        </div>

        {/* Active Instances */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-4 py-3 flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-success animate-spin" />
            <p className="text-sm font-semibold">Active Instances</p>
            <button onClick={() => navigate("/instances?scope=open")} className="ml-auto text-[10px] text-accent hover:underline font-medium">View all →</button>
          </div>
          <div className="divide-y divide-border">
            {activeInstances.length === 0 ? (
              <div className="px-4 py-6 text-xs text-muted-foreground">No active instances running.</div>
            ) : activeInstances.map((inst) => (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {definitions.map((def) => (
            <div key={def.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <StatusBadge status={def.status} />
                <span className="text-[10px] font-mono text-muted-foreground">v{def.version}</span>
              </div>
              <p className="text-sm font-semibold leading-tight">{def.name}</p>
              <p className="mt-1 text-lg font-bold">{definitionInstanceCounts[def.id] ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">instances total</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
