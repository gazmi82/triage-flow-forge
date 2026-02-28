import { Badge } from "@/components/ui/badge";
import { RoleBadge, StatusBadge } from "@/components/ui/Badges";
import { formatTime } from "@/lib/formatters";
import type { SavedTaskItem } from "../types";
import { getEffectiveProcessStatus, getPatientDisplayName, getTaskTitle } from "../utils";
import { TaskActionsMenu } from "./TaskActionsMenu";

interface SavedTasksTableProps {
  tasks: SavedTaskItem[];
  onOpenCanvas: (taskId: string) => void;
  onOpenView: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export function SavedTasksTable({ tasks, onOpenCanvas, onOpenView, onDeleteTask }: SavedTasksTableProps) {
  return (
    <div className="overflow-auto rounded-lg border bg-card">
      <table className="w-full text-xs">
        <thead className="bg-muted/40">
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Task</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Patient</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Role</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Status</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Process</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">created_at</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">updated_at</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {tasks.map((task) => {
            const processStatus = getEffectiveProcessStatus(task);
            return (
              <tr key={task.id} className="hover:bg-muted/20">
                <td className="px-3 py-2">
                  <p className="font-semibold">{getTaskTitle(task)}</p>
                  <p className="text-[10px] text-muted-foreground">{task.definitionName}</p>
                </td>
                <td className="px-3 py-2">
                  <p>{getPatientDisplayName(task)}</p>
                  <p className="text-[10px] text-muted-foreground">{task.patientId}</p>
                </td>
                <td className="px-3 py-2">
                  <RoleBadge role={task.role} />
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={task.status} />
                </td>
                <td className="px-3 py-2">
                  <Badge variant={processStatus === "open" ? "secondary" : "outline"}>{processStatus}</Badge>
                </td>
                <td className="px-3 py-2">{formatTime(task.createdAt)}</td>
                <td className="px-3 py-2">{formatTime(task.updatedAt ?? task.createdAt)}</td>
                <td className="px-3 py-2">
                  <TaskActionsMenu
                    taskId={task.id}
                    canDelete={processStatus === "closed"}
                    onCanvas={onOpenCanvas}
                    onView={onOpenView}
                    onDelete={onDeleteTask}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
