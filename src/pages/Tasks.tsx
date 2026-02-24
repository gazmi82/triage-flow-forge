import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, CheckCircle2, Clock, User } from "lucide-react";
import { ROLE_LABELS } from "@/data/constants";
import { type Role, type Task, type TriageColor } from "@/data/mockData";
import { useToast, useAuth } from "@/hooks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  bootstrapWorkflowThunk,
  claimTaskThunk,
  completeTaskThunk,
  createTaskFromConsoleThunk,
  openTaskDesignerThunk,
  saveTaskEditsThunk,
} from "@/store/slices";
import { Button, PriorityBadge, StatusBadge, TriageBadge } from "@/components/ui";
import { cn, formatSlaCountdown, minutesUntilDue, secondsUntilDue, slaBg, timeAgo } from "@/lib";
import { AuditTimeline } from "@/pages/tasks/AuditTimeline";
import { TaskForm } from "@/pages/tasks/TaskForm";
import { TaskInbox } from "@/pages/tasks/TaskInbox";
import { NodeTypePalette } from "@/pages/tasks/NodeTypePalette";
import { getDefaultNodeLabel, type TaskNodeType } from "@/pages/tasks/types";

const getDisplayPatientName = (value: string) => {
  if (/^generated from designer$/i.test(value.trim())) {
    return "Patient Name Pending";
  }
  return value;
};

export default function Tasks() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const tasks = useAppSelector((state) => state.workflow.tasks);
  const savedTasks = useAppSelector((state) => state.workflow.savedTasks);
  const audit = useAppSelector((state) => state.workflow.audit);
  const hasBootstrapped = useAppSelector((state) => state.workflow.hasBootstrapped);
  const isLoading = useAppSelector((state) => state.workflow.isLoading);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showTimeline, setShowTimeline] = useState(false);
  const [selectedNodeType, setSelectedNodeType] = useState<TaskNodeType>("userTask");
  const [createConfig, setCreateConfig] = useState<{ label: string; triageColor: TriageColor }>({
    label: getDefaultNodeLabel("userTask"),
    triageColor: "yellow",
  });
  const [nowMs, setNowMs] = useState(() => Date.now());

  const currentRole = user?.role ?? "triage_nurse";
  const visibleTasks = useMemo(() => {
    const isMine = (task: Task) =>
      currentRole === "admin" || task.role === currentRole || (user?.name ? task.assignee === user.name : false);

    const live = tasks.filter(isMine);
    const records = savedTasks.filter(isMine);

    const mergedById = new Map<string, Task>();
    for (const task of records) mergedById.set(task.id, task);
    for (const task of live) mergedById.set(task.id, task);

    return Array.from(mergedById.values()).sort(
      (a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()
    );
  }, [currentRole, savedTasks, tasks, user?.name]);

  const filtered = useMemo(
    () =>
      visibleTasks.filter(
        (t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.patientName.toLowerCase().includes(search.toLowerCase())
      ),
    [search, visibleTasks]
  );

  const selectedTask = visibleTasks.find((task) => task.id === selectedTaskId) ?? null;

  useEffect(() => {
    if (!selectedTask) return;
    setCreateConfig({
      label: selectedTask.name,
      triageColor: selectedTask.triageColor ?? "yellow",
    });
  }, [selectedTask]);

  useEffect(() => {
    if (!hasBootstrapped && !isLoading) {
      dispatch(bootstrapWorkflowThunk());
    }
  }, [dispatch, hasBootstrapped, isLoading]);

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedTaskId && !visibleTasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(null);
    }
  }, [selectedTaskId, visibleTasks]);

  const completeTask = async (payload: {
    redirectRole: Role;
    branchARole?: Role;
    branchBRole?: Role;
    xorSelectedCondition?: "critical" | "non_critical";
    patientName?: string;
    patientId?: string;
    conditionExpression?: string;
    correlationKey?: string;
    triageColor?: TriageColor;
  }) => {
    if (!selectedTask) return;

    const completedTask = selectedTask;
    await dispatch(
      completeTaskThunk({
        taskId: completedTask.id,
        actor: user?.name ?? "System",
        patientName: payload.patientName,
        patientId: payload.patientId,
      })
    );
    setSelectedTaskId(null);

    const createNodeResult = await dispatch(
      createTaskFromConsoleThunk({
        fromNodeId: completedTask.nodeId ?? null,
        instanceId: completedTask.instanceId,
        nodeType: selectedNodeType,
        label: getDefaultNodeLabel(selectedNodeType, completedTask.name),
        conditionExpression: payload.conditionExpression,
        correlationKey: payload.correlationKey,
        assignedRole: payload.redirectRole,
        triageColor: completedTask.triageColor ?? payload.triageColor ?? "yellow",
        createdByRole: user?.role ?? "triage_nurse",
        patientName: payload.patientName ?? completedTask.patientName,
        patientId: payload.patientId ?? completedTask.patientId,
        formValues: completedTask.formValues ?? {},
        registrationNote: `Auto-generated after completing ${completedTask.name}`,
      })
    );

    if (!createTaskFromConsoleThunk.fulfilled.match(createNodeResult)) return;

    if (selectedNodeType === "andGateway" && payload.branchARole && payload.branchBRole) {
      await dispatch(
        createTaskFromConsoleThunk({
          fromNodeId: createNodeResult.payload.createdNodeId,
          instanceId: completedTask.instanceId,
          nodeType: "userTask",
          label: `${ROLE_LABELS[payload.branchARole]} Task`,
          assignedRole: payload.branchARole,
          triageColor: completedTask.triageColor ?? payload.triageColor ?? "yellow",
          createdByRole: user?.role ?? "triage_nurse",
          patientName: payload.patientName ?? completedTask.patientName,
          patientId: payload.patientId ?? completedTask.patientId,
          formValues: completedTask.formValues ?? {},
          registrationNote: "Auto-generated after andGateway branch A",
        })
      );
      await dispatch(
        createTaskFromConsoleThunk({
          fromNodeId: createNodeResult.payload.createdNodeId,
          instanceId: completedTask.instanceId,
          nodeType: "userTask",
          label: `${ROLE_LABELS[payload.branchBRole]} Task`,
          assignedRole: payload.branchBRole,
          triageColor: completedTask.triageColor ?? payload.triageColor ?? "yellow",
          createdByRole: user?.role ?? "triage_nurse",
          patientName: payload.patientName ?? completedTask.patientName,
          patientId: payload.patientId ?? completedTask.patientId,
          formValues: completedTask.formValues ?? {},
          registrationNote: "Auto-generated after andGateway branch B",
        })
      );
    } else if (
      selectedNodeType === "xorGateway" &&
      payload.branchARole &&
      payload.branchBRole &&
      payload.conditionExpression &&
      payload.xorSelectedCondition
    ) {
      const xorConditions = payload.conditionExpression
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean);
      const selectedCondition =
        payload.xorSelectedCondition === "critical" ? xorConditions[0] : xorConditions[1];
      const selectedRole =
        payload.xorSelectedCondition === "critical" ? payload.branchARole : payload.branchBRole;

      await dispatch(
        createTaskFromConsoleThunk({
          fromNodeId: createNodeResult.payload.createdNodeId,
          instanceId: completedTask.instanceId,
          nodeType: "userTask",
          label: `${ROLE_LABELS[selectedRole]} Task`,
          conditionExpression: selectedCondition,
          assignedRole: selectedRole,
          triageColor: completedTask.triageColor ?? payload.triageColor ?? "yellow",
          createdByRole: user?.role ?? "triage_nurse",
          patientName: payload.patientName ?? completedTask.patientName,
          patientId: payload.patientId ?? completedTask.patientId,
          formValues: completedTask.formValues ?? {},
          registrationNote: `Auto-generated after xorGateway (${selectedCondition})`,
        })
      );
    } else if (selectedNodeType !== "userTask" && selectedNodeType !== "endEvent") {
      await dispatch(
        createTaskFromConsoleThunk({
          fromNodeId: createNodeResult.payload.createdNodeId,
          instanceId: completedTask.instanceId,
          nodeType: "userTask",
          label: `${ROLE_LABELS[payload.redirectRole]} Task`,
          assignedRole: payload.redirectRole,
          triageColor: completedTask.triageColor ?? payload.triageColor ?? "yellow",
          createdByRole: user?.role ?? "triage_nurse",
          patientName: payload.patientName ?? completedTask.patientName,
          patientId: payload.patientId ?? completedTask.patientId,
          formValues: completedTask.formValues ?? {},
          registrationNote: `Auto-generated after ${selectedNodeType}`,
        })
      );
    }

    toast({
      title: "Task progressed",
      description:
        selectedNodeType === "andGateway" && payload.branchARole && payload.branchBRole
          ? `Parallel branches created for ${ROLE_LABELS[payload.branchARole]} and ${ROLE_LABELS[payload.branchBRole]}.`
          : selectedNodeType === "xorGateway" && payload.xorSelectedCondition && payload.branchARole && payload.branchBRole
            ? `XOR routed via ${payload.xorSelectedCondition === "critical" ? "Critical" : "Non Critical"} to ${
                ROLE_LABELS[payload.xorSelectedCondition === "critical" ? payload.branchARole : payload.branchBRole]
              }.`
          : `Redirected to ${ROLE_LABELS[payload.redirectRole]}.`,
    });
    const nextTask = createNodeResult.payload.tasks.find((task) => task.nodeId === createNodeResult.payload.createdNodeId);
    setSelectedTaskId(nextTask?.id ?? null);
    setShowTimeline(false);
  };

  const saveTask = async (payload: {
    formValues: Record<string, string | boolean>;
    triageColor?: TriageColor;
    patientName?: string;
    patientId?: string;
  }) => {
    if (!selectedTask) return;
    await dispatch(
      saveTaskEditsThunk({
        taskId: selectedTask.id,
        actor: user?.name ?? "System",
        formValues: payload.formValues,
        triageColor: createConfig.triageColor,
        label: createConfig.label.trim() || selectedTask.name,
        patientName: payload.patientName,
        patientId: payload.patientId,
      })
    );
  };

  const claimTask = async (task: Task) => {
    await dispatch(claimTaskThunk({ taskId: task.id, assigneeName: user?.name ?? "Unassigned" }));
  };

  const createTask = useCallback(async (payload: { nodeType: TaskNodeType; label: string; triageColor: TriageColor }) => {
    const created = await dispatch(
      createTaskFromConsoleThunk({
        fromNodeId: null,
        instanceId: null,
        nodeType: payload.nodeType,
        label: payload.label.trim() || getDefaultNodeLabel(payload.nodeType),
        triageColor: payload.triageColor,
        assignedRole: currentRole,
        createdByRole: user?.role ?? "triage_nurse",
        patientName: "Generated from Task Console",
        patientId: `P-${Date.now()}`,
        registrationNote: "Created from shape/type accordion",
      })
    );

    if (!createTaskFromConsoleThunk.fulfilled.match(created)) return;
    const createdTask = created.payload.tasks.find((task) => task.nodeId === created.payload.createdNodeId);
    if (createdTask) {
      setSelectedTaskId(createdTask.id);
    }
  }, [currentRole, dispatch, user?.role]);

  useEffect(() => {
    const handleCreateFromTopBar = () => {
      void createTask({
        nodeType: selectedNodeType,
        label: createConfig.label,
        triageColor: createConfig.triageColor,
      });
    };

    window.addEventListener("task-console:create", handleCreateFromTopBar);
    return () => window.removeEventListener("task-console:create", handleCreateFromTopBar);
  }, [createConfig.label, createConfig.triageColor, createTask, selectedNodeType]);

  const openTaskProcessDesign = async (taskId: string) => {
    await dispatch(openTaskDesignerThunk({ taskId }));
    navigate("/designer");
  };

  const liveMinutesRemaining = selectedTask ? minutesUntilDue(selectedTask.dueAt, nowMs) : 0;
  const liveSecondsRemaining = selectedTask ? secondsUntilDue(selectedTask.dueAt, nowMs) : 0;

  return (
    <div className="flex h-full flex-col md:flex-row">
      <div className="flex w-full flex-col border-b border-border bg-card md:w-72 md:min-w-72 md:border-b-0 md:border-r lg:w-80 lg:min-w-80">
        <TaskInbox
          tasks={filtered}
          search={search}
          onSearchChange={setSearch}
          selectedTaskId={selectedTaskId}
          onSelectTask={(taskId) => {
            setSelectedTaskId(taskId);
            setShowTimeline(false);
          }}
          onOpenProcess={openTaskProcessDesign}
        />
        <NodeTypePalette
          selected={selectedNodeType}
          onSelect={setSelectedNodeType}
          onConfigChange={(payload) => {
            setSelectedNodeType(payload.nodeType);
            setCreateConfig({ label: payload.label, triageColor: payload.triageColor });
          }}
          currentRole={currentRole}
        />
      </div>

      {selectedTask ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-border bg-card px-4 py-4 md:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <h1 className="text-base font-bold">{selectedTask.name}</h1>
                  <PriorityBadge priority={selectedTask.priority} />
                  <StatusBadge status={selectedTask.status} />
                  {selectedTask.triageColor ? <TriageBadge triageColor={selectedTask.triageColor} /> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedTask.definitionName} · Instance {selectedTask.instanceId} · Patient: <strong>{getDisplayPatientName(selectedTask.patientName)}</strong> ({selectedTask.patientId})
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowTimeline(!showTimeline)}>
                  <Activity className="h-3.5 w-3.5" />
                  {showTimeline ? "Hide" : "Show"} Timeline
                </Button>
                {selectedTask.status === "pending" && (
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => claimTask(selectedTask)}>
                    <User className="h-3.5 w-3.5" />
                    Claim Task
                  </Button>
                )}
              </div>
            </div>

            <div className={cn("mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-xs", slaBg(liveMinutesRemaining))}>
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              {liveMinutesRemaining < 0
                ? `⚠ SLA breached — ${formatSlaCountdown(liveSecondsRemaining)}`
                : `SLA: ${formatSlaCountdown(liveSecondsRemaining)} (due ${timeAgo(selectedTask.dueAt)})`}
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
            <div className="flex-1 overflow-y-auto p-6">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Task Form</p>
              <div className="max-w-lg">
                <TaskForm
                  task={selectedTask}
                  selectedNodeType={selectedNodeType}
                  onComplete={completeTask}
                  onSave={saveTask}
                />
              </div>
            </div>

            {showTimeline && (
              <div className="w-full overflow-y-auto border-t border-border bg-muted/20 p-4 md:w-72 md:border-l md:border-t-0">
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
            <p className="text-sm text-muted-foreground">Use Create in the top bar to start a task when the board is empty.</p>
          </div>
          <div className="flex-1" />
        </div>
      )}
    </div>
  );
}
