import { useEffect, useMemo, useState } from "react";
import { MOCK_TASKS, MOCK_AUDIT, type Task } from "@/data/mockData";
import { RoleBadge, PriorityBadge, StatusBadge } from "@/components/ui/Badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { slaBg, timeAgo, formatTime } from "@/lib/formatters";
import {
  Clock, User, Search, ChevronRight, AlertTriangle,
  CheckCircle2, Activity, Milestone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function SlaTimer({ minutesRemaining }: { minutesRemaining: number }) {
  const abs = Math.abs(minutesRemaining);
  const label = minutesRemaining < 0 ? `${abs}m overdue` : `${abs}m left`;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", slaBg(minutesRemaining))}>
      <Clock className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

function TaskForm({ task, onComplete }: { task: Task; onComplete: () => void }) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues({});
    setErrors({});
  }, [task.id]);

  const setFieldValue = (fieldId: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const { [fieldId]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    for (const field of task.formFields) {
      if (!field.required) continue;
      const value = values[field.id];
      if (field.type === "boolean") {
        if (typeof value !== "boolean") nextErrors[field.id] = "This field is required.";
        continue;
      }
      if (typeof value !== "string" || value.trim().length === 0) {
        nextErrors[field.id] = "This field is required.";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({ title: "Missing required fields", description: "Complete all required inputs before submitting.", variant: "destructive" });
      return;
    }
    toast({ title: "Task completed", description: `"${task.name}" has been completed and the process advanced.` });
    onComplete();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {task.formFields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <Label className="text-xs font-medium">
            {field.label}
            {field.required && <span className="ml-1 text-destructive">*</span>}
          </Label>
          {field.type === "text" && (
            <Input
              className="h-8 text-sm"
              value={typeof values[field.id] === "string" ? values[field.id] : ""}
              onChange={(e) => setFieldValue(field.id, e.target.value)}
              aria-invalid={Boolean(errors[field.id])}
            />
          )}
          {field.type === "number" && (
            <Input
              type="number"
              className="h-8 text-sm"
              value={typeof values[field.id] === "string" ? values[field.id] : ""}
              onChange={(e) => setFieldValue(field.id, e.target.value)}
              aria-invalid={Boolean(errors[field.id])}
            />
          )}
          {field.type === "textarea" && (
            <Textarea
              className="text-sm min-h-[72px]"
              value={typeof values[field.id] === "string" ? values[field.id] : ""}
              onChange={(e) => setFieldValue(field.id, e.target.value)}
              aria-invalid={Boolean(errors[field.id])}
            />
          )}
          {field.type === "select" && (
            <Select
              value={typeof values[field.id] === "string" ? values[field.id] : undefined}
              onValueChange={(value) => setFieldValue(field.id, value)}
            >
              <SelectTrigger className="h-8 text-sm" aria-invalid={Boolean(errors[field.id])}>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {field.type === "boolean" && (
            <div className="flex items-center gap-2">
              <Checkbox
                id={field.id}
                checked={values[field.id] === true}
                onCheckedChange={(checked) => setFieldValue(field.id, checked === true)}
                aria-invalid={Boolean(errors[field.id])}
              />
              <label htmlFor={field.id} className="text-sm cursor-pointer">Yes</label>
            </div>
          )}
          {errors[field.id] && <p className="text-[11px] text-destructive">{errors[field.id]}</p>}
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <Button type="submit" size="sm" className="gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Complete Task
        </Button>
        <Button type="button" variant="outline" size="sm">Save Draft</Button>
      </div>
    </form>
  );
}

function AuditTimeline({ instanceId }: { instanceId: string }) {
  const events = MOCK_AUDIT.filter((e) => e.instanceId === instanceId);
  const iconMap: Record<string, React.ReactNode> = {
    instance_started: <Activity className="h-3.5 w-3.5 text-success" />,
    task_created: <Milestone className="h-3.5 w-3.5 text-info" />,
    task_claimed: <User className="h-3.5 w-3.5 text-accent" />,
    task_completed: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
    timer_fired: <Clock className="h-3.5 w-3.5 text-warning" />,
    gateway_passed: <ChevronRight className="h-3.5 w-3.5 text-node-gateway-xor" />,
    signal_received: <AlertTriangle className="h-3.5 w-3.5 text-node-message" />,
  };

  return (
    <div className="space-y-2">
      {events.map((ev, i) => (
        <div key={ev.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted border border-border flex-shrink-0">
              {iconMap[ev.eventType] || <Milestone className="h-3.5 w-3.5" />}
            </div>
            {i < events.length - 1 && <div className="mt-1 flex-1 w-px bg-border" style={{ minHeight: "16px" }} />}
          </div>
          <div className="pb-3 min-w-0">
            <p className="text-xs font-medium leading-tight capitalize">{ev.eventType.replace(/_/g, " ")}</p>
            <p className="text-[10px] text-muted-foreground">{ev.nodeName} · {ev.actor} · <RoleBadge role={ev.role} className="text-[9px] px-1.5 py-0" /></p>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/60">{formatTime(ev.timestamp)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [selectedTask, setSelectedTask] = useState<Task | null>(tasks[0]);
  const [search, setSearch] = useState("");
  const [showTimeline, setShowTimeline] = useState(false);

  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.patientName.toLowerCase().includes(search.toLowerCase())
      ),
    [search, tasks]
  );

  useEffect(() => {
    if (!selectedTask) return;
    if (!tasks.some((task) => task.id === selectedTask.id)) {
      setSelectedTask(tasks[0] ?? null);
    }
  }, [selectedTask, tasks]);

  const completeTask = () => {
    if (!selectedTask) return;
    setTasks((prev) => prev.filter((t) => t.id !== selectedTask.id));
  };

  const claimTask = (task: Task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: "claimed" as const, assignee: "Dr. Emily Chen" } : t));
    setSelectedTask(prev => prev?.id === task.id ? { ...prev, status: "claimed", assignee: "Dr. Emily Chen" } : prev);
  };

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Task List */}
      <div className="flex w-full flex-col border-b border-border bg-card md:w-80 md:min-w-80 md:border-b-0 md:border-r">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-bold mb-2">My Task Inbox</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-xs"
              placeholder="Search tasks or patients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <CheckCircle2 className="h-8 w-8 text-success mb-2" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs text-muted-foreground">No tasks match your search</p>
            </div>
          )}
          {filtered.map((task) => (
            <button
              key={task.id}
              onClick={() => { setSelectedTask(task); setShowTimeline(false); }}
              className={cn(
                "w-full text-left px-4 py-3 transition-colors hover:bg-muted/60",
                selectedTask?.id === task.id && "bg-primary/5 border-l-2 border-l-primary"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-xs font-semibold leading-tight">{task.name}</p>
                <SlaTimer minutesRemaining={task.minutesRemaining} />
              </div>
              <p className="text-[10px] text-muted-foreground mb-1.5">{task.patientName} · {task.patientId}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                <RoleBadge role={task.role} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Task Detail */}
      {selectedTask ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b border-border bg-card px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-base font-bold">{selectedTask.name}</h1>
                  <PriorityBadge priority={selectedTask.priority} />
                  <StatusBadge status={selectedTask.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedTask.definitionName} · Instance {selectedTask.instanceId} · Patient: <strong>{selectedTask.patientName}</strong> ({selectedTask.patientId})
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline" size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setShowTimeline(!showTimeline)}
                >
                  <Activity className="h-3.5 w-3.5" />
                  {showTimeline ? "Hide" : "Show"} Timeline
                </Button>
                {selectedTask.status === "pending" && (
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => claimTask(selectedTask)}>
                    <User className="h-3.5 w-3.5" />
                    Claim Task
                  </Button>
                )}
              </div>
            </div>

            {/* SLA bar */}
            <div className={cn("mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-xs", slaBg(selectedTask.minutesRemaining))}>
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              {selectedTask.minutesRemaining < 0
                ? `⚠ SLA breached — ${Math.abs(selectedTask.minutesRemaining)} minutes overdue`
                : `SLA: ${selectedTask.minutesRemaining} minutes remaining (due ${timeAgo(selectedTask.dueAt)})`
              }
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
            {/* Form */}
            <div className="flex-1 overflow-y-auto p-6">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Task Form</p>
              <div className="max-w-lg">
                <TaskForm task={selectedTask} onComplete={completeTask} />
              </div>
            </div>

            {/* Timeline */}
            {showTimeline && (
              <div className="w-full border-t border-border overflow-y-auto bg-muted/20 p-4 md:w-72 md:border-l md:border-t-0">
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Audit Timeline</p>
                <AuditTimeline instanceId={selectedTask.instanceId} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-center">
          <div>
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" />
            <p className="font-semibold">No task selected</p>
            <p className="text-sm text-muted-foreground">Select a task from the inbox to view details</p>
          </div>
        </div>
      )}
    </div>
  );
}
