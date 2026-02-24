import { CheckCircle2, Search } from "lucide-react";
import { Button, Input, PriorityBadge, RoleBadge, StatusBadge, TriageBadge } from "@/components/ui";
import { cn } from "@/lib";
import type { Task } from "@/data/mockData";
import { SlaTimer } from "@/pages/tasks/SlaTimer";

const getDisplayPatientName = (value: string) => {
  if (/^generated from designer$/i.test(value.trim())) {
    return "Patient Name Pending";
  }
  return value;
};

interface TaskInboxProps {
  tasks: Task[];
  search: string;
  onSearchChange: (value: string) => void;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onOpenProcess: (taskId: string) => void;
}

export function TaskInbox({
  tasks,
  search,
  onSearchChange,
  selectedTaskId,
  onSelectTask,
  onOpenProcess,
}: TaskInboxProps) {
  return (
    <div className="flex-1 overflow-y-auto divide-y divide-border">
      <div className="border-b border-border p-4">
        <h2 className="mb-2 text-sm font-bold">My Task Inbox</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-xs"
            placeholder="Search tasks or patients..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {tasks.length === 0 && (
        <div className="flex h-40 flex-col items-center justify-center text-center">
          <CheckCircle2 className="mb-2 h-8 w-8 text-success" />
          <p className="text-sm font-medium">All caught up!</p>
          <p className="text-xs text-muted-foreground">No tasks match your search</p>
        </div>
      )}

      {tasks.map((task) => (
        <div
          key={task.id}
          role="button"
          tabIndex={0}
          aria-label={task.name}
          onClick={() => onSelectTask(task.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelectTask(task.id);
            }
          }}
          className={cn(
            "w-full cursor-pointer px-4 py-3 transition-colors hover:bg-muted/60",
            selectedTaskId === task.id && "border-l-2 border-l-primary bg-primary/5"
          )}
        >
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <div className="flex-1 text-left">
              <p className="text-xs font-semibold leading-tight">{task.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <SlaTimer dueAt={task.dueAt} />
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px]"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenProcess(task.id);
                }}
              >
                Process
              </Button>
            </div>
          </div>
          <p className="mb-1.5 text-[10px] text-muted-foreground">
            {getDisplayPatientName(task.patientName)} · {task.patientId}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {task.triageColor ? <TriageBadge triageColor={task.triageColor} /> : null}
            <RoleBadge role={task.role} />
          </div>
        </div>
      ))}
    </div>
  );
}
