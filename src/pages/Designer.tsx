import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, GitBranch } from "lucide-react";
import { DesignerCanvas } from "@/components/designer/DesignerCanvas";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { openTaskDesignerThunk } from "@/store/slices/workflowSlice";

export default function Designer() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get("taskId");
  const mode = searchParams.get("mode");
  const activeTaskDesignId = useAppSelector((state) => state.workflow.activeTaskDesignId);
  const designerNodes = useAppSelector((state) => state.workflow.designerNodes);

  useEffect(() => {
    if (!taskId) return;
    if (activeTaskDesignId === taskId && designerNodes.length > 0) return;
    void dispatch(openTaskDesignerThunk({ taskId }));
  }, [activeTaskDesignId, designerNodes.length, dispatch, taskId]);

  const canRenderDesigner = useMemo(() => {
    if (taskId) return true;
    if (mode === "draft") return true;
    return false;
  }, [mode, taskId]);

  if (!canRenderDesigner) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <GitBranch className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold">No process selected</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Open the process from Task Console or Saved Tasks to view a task-specific workflow canvas.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Button variant="outline" onClick={() => navigate("/saved-tasks")}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Saved Tasks
            </Button>
            <Button onClick={() => navigate("/tasks")}>
              <ClipboardList className="mr-1.5 h-4 w-4" />
              Task Console
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        <DesignerCanvas />
      </div>
    </div>
  );
}
