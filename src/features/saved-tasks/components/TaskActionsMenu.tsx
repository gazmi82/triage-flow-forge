import { EllipsisVertical, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TaskActionsMenuProps {
  taskId: string;
  canDelete: boolean;
  onCanvas: (taskId: string) => void;
  onView: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

export function TaskActionsMenu({ taskId, canDelete, onCanvas, onView, onDelete }: TaskActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label={`Actions for ${taskId}`}
        >
          <EllipsisVertical className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onSelect={() => onCanvas(taskId)}>Canvas</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onView(taskId)}>
          <Eye className="mr-2 h-3.5 w-3.5" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canDelete}
          onSelect={() => onDelete(taskId)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
