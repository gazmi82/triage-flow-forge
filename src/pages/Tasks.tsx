import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROLE_LABELS, type AuditEvent, type DesignerGraphPayload, type Role, type Task } from "@/data/mockData";
import { RoleBadge, PriorityBadge, StatusBadge, Button, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Checkbox } from "@/components/ui";
import { cn, slaBg, timeAgo, formatTime } from "@/lib";
import {
  Clock, User, Search, ChevronRight, AlertTriangle,
  CheckCircle2, Activity, Milestone, Circle, Diamond, Square, Mail, ChevronsUpDown
} from "lucide-react";
import { useToast, useAuth } from "@/hooks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { bootstrapWorkflowThunk, claimTaskThunk, completeTaskThunk, createTaskFromConsoleThunk, openTaskDesignerThunk, saveDraftThunk } from "@/store/slices";

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

function TaskForm({ task, onComplete, onSaveDraft }: { task: Task; onComplete: () => void; onSaveDraft: () => void }) {
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
        <Button type="button" variant="outline" size="sm" onClick={onSaveDraft}>Save Draft</Button>
      </div>
    </form>
  );
}

function AuditTimeline({ instanceId, events }: { instanceId: string; events: AuditEvent[] }) {
  const instanceEvents = [...events.filter((e) => e.instanceId === instanceId)]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
      {instanceEvents.map((ev, i) => (
        <div key={ev.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-muted border border-border flex-shrink-0">
              {i === 0 && (
                <>
                  <span className="absolute inline-flex h-5 w-5 animate-ping rounded-full bg-success/35" />
                  <span className="absolute h-2 w-2 rounded-full bg-success" />
                </>
              )}
              {iconMap[ev.eventType] || <Milestone className="h-3.5 w-3.5" />}
            </div>
            {i < instanceEvents.length - 1 && <div className="mt-1 flex-1 w-px bg-border" style={{ minHeight: "16px" }} />}
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

const NODE_TYPE_LABELS: Record<DesignerGraphPayload["nodes"][number]["type"], string> = {
  startEvent: "Start Event",
  endEvent: "End Event",
  timerEvent: "Timer Event",
  messageEvent: "Message Event",
  signalEvent: "Signal Event",
  userTask: "User Task",
  xorGateway: "XOR Gateway",
  andGateway: "AND Gateway",
};

const getDefaultNodeLabel = (type: DesignerGraphPayload["nodes"][number]["type"], seed?: string) => {
  if (seed?.trim()) return `${seed.trim()} Next`;
  return NODE_TYPE_LABELS[type];
};

function NodeTypePalette({
  selected,
  onSelect,
  onCreate,
}: {
  selected: DesignerGraphPayload["nodes"][number]["type"];
  onSelect: (value: DesignerGraphPayload["nodes"][number]["type"]) => void;
  onCreate: (assignedRole: Role) => void;
}) {
  const [open, setOpen] = useState(true);
  const [assignedRole, setAssignedRole] = useState<Role>("triage_nurse");
  const buttonClass = (value: DesignerGraphPayload["nodes"][number]["type"], tint: string) =>
    cn(
      "flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs font-semibold transition-colors",
      selected === value ? tint : "border-border bg-card hover:bg-muted/50"
    );

  return (
    <div className="border-t border-border bg-card p-3">
      <button
        className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-xs font-semibold"
        onClick={() => setOpen((prev) => !prev)}
      >
        Shape / Type
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Events</p>
            <div className="grid grid-cols-2 gap-2">
              <button className={buttonClass("startEvent", "border-success/40 bg-success/10 text-success")} onClick={() => onSelect("startEvent")}><Circle className="h-3.5 w-3.5" />Start</button>
              <button className={buttonClass("endEvent", "border-destructive/40 bg-destructive/10 text-destructive")} onClick={() => onSelect("endEvent")}><Circle className="h-3.5 w-3.5" />End</button>
              <button className={buttonClass("timerEvent", "border-info/40 bg-info/10 text-info")} onClick={() => onSelect("timerEvent")}><Clock className="h-3.5 w-3.5" />Timer</button>
              <button className={buttonClass("messageEvent", "border-accent/40 bg-accent/10 text-accent")} onClick={() => onSelect("messageEvent")}><Mail className="h-3.5 w-3.5" />Message</button>
              <button className={buttonClass("signalEvent", "border-warning/40 bg-warning/10 text-warning")} onClick={() => onSelect("signalEvent")}><AlertTriangle className="h-3.5 w-3.5" />Signal</button>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tasks</p>
            <div className="grid grid-cols-2 gap-2">
              <button className={buttonClass("userTask", "border-primary/40 bg-primary/10 text-primary")} onClick={() => onSelect("userTask")}><Square className="h-3.5 w-3.5" />User Task</button>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Gateways</p>
            <div className="grid grid-cols-2 gap-2">
              <button className={buttonClass("xorGateway", "border-node-gateway-xor/40 bg-node-gateway-xor/10 text-node-gateway-xor")} onClick={() => onSelect("xorGateway")}><Diamond className="h-3.5 w-3.5" />XOR</button>
              <button className={buttonClass("andGateway", "border-node-gateway-and/40 bg-node-gateway-and/10 text-node-gateway-and")} onClick={() => onSelect("andGateway")}><Diamond className="h-3.5 w-3.5" />AND</button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Assigned Role</Label>
            <Select value={assignedRole} onValueChange={(value) => setAssignedRole(value as Role)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reception">{ROLE_LABELS.reception}</SelectItem>
                <SelectItem value="triage_nurse">{ROLE_LABELS.triage_nurse}</SelectItem>
                <SelectItem value="physician">{ROLE_LABELS.physician}</SelectItem>
                <SelectItem value="lab">{ROLE_LABELS.lab}</SelectItem>
                <SelectItem value="radiology">{ROLE_LABELS.radiology}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button size="sm" className="h-8 w-full text-xs" onClick={() => onCreate(assignedRole)}>
            Create Task
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Tasks() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const tasks = useAppSelector((state) => state.workflow.tasks);
  const audit = useAppSelector((state) => state.workflow.audit);
  const hasBootstrapped = useAppSelector((state) => state.workflow.hasBootstrapped);
  const isLoading = useAppSelector((state) => state.workflow.isLoading);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showTimeline, setShowTimeline] = useState(false);
  const [selectedNodeType, setSelectedNodeType] = useState<DesignerGraphPayload["nodes"][number]["type"]>("userTask");
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  useEffect(() => {
    if (!hasBootstrapped && !isLoading) {
      dispatch(bootstrapWorkflowThunk());
    }
  }, [dispatch, hasBootstrapped, isLoading]);

  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.patientName.toLowerCase().includes(search.toLowerCase())
      ),
    [search, tasks]
  );

  useEffect(() => {
    if (!selectedTaskId && tasks.length > 0) {
      setSelectedTaskId(tasks[0].id);
      return;
    }
    if (selectedTaskId && !tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(tasks[0]?.id ?? null);
    }
  }, [selectedTaskId, tasks]);

  const completeTask = async () => {
    if (!selectedTask) return;
    await dispatch(completeTaskThunk({ taskId: selectedTask.id, actor: user?.name ?? "System" }));
    const createResult = await dispatch(
      createTaskFromConsoleThunk({
        fromNodeId: selectedTask.nodeId ?? null,
        instanceId: selectedTask.instanceId,
        nodeType: selectedNodeType,
        label: getDefaultNodeLabel(selectedNodeType, selectedTask.name),
        assignedRole: user?.role ?? "triage_nurse",
        createdByRole: user?.role ?? "triage_nurse",
        patientName: selectedTask.patientName,
        patientId: selectedTask.patientId,
        registrationNote: `Auto-generated after completing ${selectedTask.name}`,
      })
    );
    if (createTaskFromConsoleThunk.fulfilled.match(createResult) && selectedNodeType === "userTask") {
      const createdTask = createResult.payload.tasks[0];
      if (createdTask?.id) {
        await dispatch(claimTaskThunk({ taskId: createdTask.id, assigneeName: user?.name ?? "Unassigned" }));
      }
    }
    setShowTimeline(false);
  };

  const saveDraft = async () => {
    await dispatch(saveDraftThunk());
  };

  const claimTask = async (task: Task) => {
    await dispatch(claimTaskThunk({ taskId: task.id, assigneeName: user?.name ?? "Unassigned" }));
  };

  const createTask = async (assignedRole: Role) => {
    await dispatch(
      createTaskFromConsoleThunk({
        fromNodeId: selectedTask?.nodeId ?? null,
        instanceId: selectedTask?.instanceId ?? null,
        nodeType: selectedNodeType,
        label: getDefaultNodeLabel(selectedNodeType, selectedTask?.name),
        assignedRole,
        createdByRole: user?.role ?? "triage_nurse",
        patientName: selectedTask?.patientName ?? "Generated from Task Console",
        patientId: selectedTask?.patientId ?? "P-NEW",
        registrationNote: "Created from shape/type accordion",
      })
    );
  };

  const openTaskProcessDesign = async (taskId: string) => {
    await dispatch(openTaskDesignerThunk({ taskId }));
    navigate("/designer");
  };

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Task List */}
      <div className="flex w-full flex-col border-b border-border bg-card md:w-72 md:min-w-72 md:border-b-0 md:border-r lg:w-80 lg:min-w-80">
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
            <div
              key={task.id}
              className={cn(
                "w-full px-4 py-3 transition-colors hover:bg-muted/60",
                selectedTaskId === task.id && "bg-primary/5 border-l-2 border-l-primary"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <button onClick={() => { setSelectedTaskId(task.id); setShowTimeline(false); }} className="flex-1 text-left">
                  <p className="text-xs font-semibold leading-tight">{task.name}</p>
                </button>
                <div className="flex items-center gap-2">
                  <SlaTimer minutesRemaining={task.minutesRemaining} />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => openTaskProcessDesign(task.id)}
                  >
                    Process
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mb-1.5">{task.patientName} · {task.patientId}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                <RoleBadge role={task.role} />
              </div>
            </div>
          ))}
        </div>
        <NodeTypePalette selected={selectedNodeType} onSelect={setSelectedNodeType} onCreate={createTask} />
      </div>

      {/* Task Detail */}
      {selectedTask ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b border-border bg-card px-4 py-4 md:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
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
                <TaskForm task={selectedTask} onComplete={completeTask} onSaveDraft={saveDraft} />
              </div>
            </div>

            {/* Timeline */}
            {showTimeline && (
              <div className="w-full border-t border-border overflow-y-auto bg-muted/20 p-4 md:w-72 md:border-l md:border-t-0">
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Audit Timeline</p>
                <AuditTimeline instanceId={selectedTask.instanceId} events={audit} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="border-b border-border bg-card px-4 py-4 md:px-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <p className="text-base font-semibold">No task selected</p>
            </div>
            <p className="text-sm text-muted-foreground">Create tasks from the shape/type accordion in the left panel.</p>
          </div>
          <div className="flex-1" />
        </div>
      )}
    </div>
  );
}
