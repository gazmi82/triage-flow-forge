import { MOCK_INSTANCES, MOCK_DEFINITIONS } from "@/data/mockData";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/formatters";
import { Activity, Eye, RotateCcw, AlertCircle, CheckCircle2, Loader2, PauseCircle } from "lucide-react";

const STATUS_ICONS = {
  active: <Loader2 className="h-4 w-4 text-success animate-spin" />,
  completed: <CheckCircle2 className="h-4 w-4 text-muted-foreground" />,
  suspended: <PauseCircle className="h-4 w-4 text-warning" />,
  error: <AlertCircle className="h-4 w-4 text-destructive" />,
};

export default function Instances() {
  const defCounts = MOCK_DEFINITIONS.reduce((acc, d) => {
    acc[d.id] = MOCK_INSTANCES.filter(i => i.definitionId === d.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-lg font-bold">Instance Monitor</h1>
        <p className="text-xs text-muted-foreground">Active and historical process instances</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Active", value: MOCK_INSTANCES.filter(i => i.status === "active").length, color: "text-success", bg: "bg-success/10 border-success/30" },
          { label: "Completed", value: MOCK_INSTANCES.filter(i => i.status === "completed").length, color: "text-muted-foreground", bg: "bg-muted border-border" },
          { label: "Suspended", value: MOCK_INSTANCES.filter(i => i.status === "suspended").length, color: "text-warning", bg: "bg-warning/10 border-warning/30" },
          { label: "Error", value: MOCK_INSTANCES.filter(i => i.status === "error").length, color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
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
          <p className="text-sm font-semibold">All Instances</p>
          <Badge variant="secondary" className="ml-auto text-xs">{MOCK_INSTANCES.length} total</Badge>
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
              {MOCK_INSTANCES.map((inst) => (
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
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {inst.status === "error" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
