import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge, RoleBadge, StatusBadge } from "@/components/ui/Badges";
import { formatTime } from "@/lib/formatters";
import type { SavedTaskItem } from "../types";
import { getEffectiveProcessStatus, getPatientDisplayName, getTaskTitle } from "../utils";

interface SavedTasksCardsProps {
  tasks: SavedTaskItem[];
  onOpenCanvas: (taskId: string) => void;
  onOpenView: (taskId: string) => void;
}

export function SavedTasksCards({ tasks, onOpenCanvas, onOpenView }: SavedTasksCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {tasks.map((task) => {
        const processStatus = getEffectiveProcessStatus(task);
        return (
          <Card key={task.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{getTaskTitle(task)}</CardTitle>
              <CardDescription className="text-xs">{task.definitionName}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-2 text-xs">
              <div className="flex gap-1.5">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                <RoleBadge role={task.role} />
              </div>
              <p>
                {getPatientDisplayName(task)} · {task.patientId}
              </p>
              <p className="text-muted-foreground">created_at: {formatTime(task.createdAt)}</p>
              <p className="text-muted-foreground">updated_at: {formatTime(task.updatedAt ?? task.createdAt)}</p>
              <Badge variant={processStatus === "open" ? "secondary" : "outline"}>{processStatus}</Badge>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => onOpenCanvas(task.id)}>
                  Canvas
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => onOpenView(task.id)}>
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
