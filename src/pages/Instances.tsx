import { useEffect, useMemo } from "react";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/formatters";
import { Activity, Eye, RotateCcw, AlertCircle, CheckCircle2, Loader2, PauseCircle } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { bootstrapWorkflowThunk } from "@/store/slices/workflowSlice";
import { useSearchParams } from "react-router-dom";
import type { ProcessInstance, Task } from "@/data/contracts";

const STATUS_ICONS = {
  active: <Loader2 className="h-4 w-4 text-success animate-spin" />,
  completed: <CheckCircle2 className="h-4 w-4 text-muted-foreground" />,
  suspended: <PauseCircle className="h-4 w-4 text-warning" />,
  error: <AlertCircle className="h-4 w-4 text-destructive" />,
};

export default function Instances() {
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const instances = useAppSelector((state) => state.workflow.instances);
  const tasks = useAppSelector((state) => state.workflow.tasks);
  const hasBootstrapped = useAppSelector((state) => state.workflow.hasBootstrapped);
  const isLoading = useAppSelector((state) => state.workflow.isLoading);
  const scope = searchParams.get("scope");

  useEffect(() => {
    if (!hasBootstrapped && !isLoading) {
      dispatch(bootstrapWorkflowThunk());
    }
  }, [dispatch, hasBootstrapped, isLoading]);

  const openTasksByInstanceId = useMemo(
    () =>
      tasks.reduce<Map<string, Task[]>>((acc, task) => {
        if (task.status === "completed") return acc;
        const bucket = acc.get(task.instanceId) ?? [];
        bucket.push(task);
        acc.set(task.instanceId, bucket);
        return acc;
      }, new Map()),
    [tasks]
  );

  const effectiveInstances = useMemo(() => {
    const rows = instances.map((instance) => {
      const instanceTasks = openTasksByInstanceId.get(instance.id) ?? [];
      const prioritizedTask = [...instanceTasks].sort((a, b) => {
        const taskScore = (status: Task["status"]) => (status === "claimed" ? 0 : status === "overdue" ? 1 : 2);
        const scoreDiff = taskScore(a.status) - taskScore(b.status);
        if (scoreDiff !== 0) return scoreDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      })[0];

      const effectiveStatus: ProcessInstance["status"] = instanceTasks.length > 0 ? "active" : instance.status;

      return {
        ...instance,
        status: effectiveStatus,
        currentNode: prioritizedTask?.name ?? instance.currentNode,
        priority: prioritizedTask?.priority ?? instance.priority,
      };
    });

    // Include open-task instances not yet present in instance registry.
    for (const [instanceId, instanceTasks] of openTasksByInstanceId.entries()) {
      if (rows.some((row) => row.id === instanceId)) continue;
      const prioritizedTask = [...instanceTasks].sort((a, b) => {
        const taskScore = (status: Task["status"]) => (status === "claimed" ? 0 : status === "overdue" ? 1 : 2);
        const scoreDiff = taskScore(a.status) - taskScore(b.status);
        if (scoreDiff !== 0) return scoreDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      })[0];
      if (!prioritizedTask) continue;
      rows.push({
        id: instanceId,
        definitionId: "unknown",
        definitionName: prioritizedTask.definitionName,
        status: "active",
        startedAt: prioritizedTask.createdAt,
        startedBy: prioritizedTask.assignee ?? "System",
        currentNode: prioritizedTask.name,
        priority: prioritizedTask.priority,
        patientId: prioritizedTask.patientId,
        patientName: prioritizedTask.patientName,
      });
    }

    return rows;
  }, [instances, openTasksByInstanceId]);

  const visibleInstances = useMemo(
    () => (scope === "open" ? effectiveInstances.filter((instance) => instance.status === "active") : effectiveInstances),
    [effectiveInstances, scope]
  );

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-lg font-bold">Instance Monitor</h1>
        <p className="text-xs text-muted-foreground">
          {scope === "open" ? "Open instances inferred from non-completed tasks" : "Active and historical process instances"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          {[
          { label: "Active", value: effectiveInstances.filter(i => i.status === "active").length, color: "text-success", bg: "bg-success/10 border-success/30" },
          { label: "Completed", value: effectiveInstances.filter(i => i.status === "completed").length, color: "text-muted-foreground", bg: "bg-muted border-border" },
          { label: "Suspended", value: effectiveInstances.filter(i => i.status === "suspended").length, color: "text-warning", bg: "bg-warning/10 border-warning/30" },
          { label: "Error", value: effectiveInstances.filter(i => i.status === "error").length, color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
        ].map((s) => (
          <div key={s.label} className={`rounded-lg border p-4 ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">{scope === "open" ? "Open Instances" : "All Instances"}</p>
          <Badge variant="secondary" className="ml-auto text-xs">{visibleInstances.length} total</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Instance ID</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Process</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Patient</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Priority</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Current Node</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Started</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleInstances.map((inst) => (
                <tr key={inst.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{inst.id}</td>
                  <td className="px-4 py-3 font-medium">{inst.definitionName}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{inst.patientName}</p>
                      <p className="text-muted-foreground font-mono text-[10px]">{inst.patientId}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {STATUS_ICONS[inst.status]}
                      <StatusBadge status={inst.status} />
                    </div>
                  </td>
                  <td className="px-4 py-3"><PriorityBadge priority={inst.priority} /></td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-primary font-medium">
                      {inst.currentNode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{timeAgo(inst.startedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`View instance ${inst.id}`} title={`View instance ${inst.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {inst.status === "error" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" aria-label={`Retry instance ${inst.id}`} title={`Retry instance ${inst.id}`}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleInstances.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                    No instances in this scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
