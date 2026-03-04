import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  bootstrapWorkflowThunk,
  deleteTaskThunk,
  loadDraftThunk,
  openTaskDesignerThunk,
} from "@/store/slices/workflowSlice";
import { DraftsPanel } from "./components/DraftsPanel";
import { SavedTasksCards } from "./components/SavedTasksCards";
import { SavedTasksFilters } from "./components/SavedTasksFilters";
import { SavedTasksStats } from "./components/SavedTasksStats";
import { SavedTasksTable } from "./components/SavedTasksTable";
import type { ProcessStatus, SortDirection, SortField, ViewMode } from "./types";
import { filterAndSortSavedTasks, getEffectiveProcessStatus } from "./utils";

export function SavedTasksPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const savedTasks = useAppSelector((state) => state.workflow.savedTasks);
  const drafts = useAppSelector((state) => state.workflow.drafts);
  const hasBootstrapped = useAppSelector((state) => state.workflow.hasBootstrapped);
  const isLoading = useAppSelector((state) => state.workflow.isLoading);

  const [query, setQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [status, setStatus] = useState<ProcessStatus>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  useEffect(() => {
    if (!hasBootstrapped && !isLoading) {
      dispatch(bootstrapWorkflowThunk());
    }
  }, [dispatch, hasBootstrapped, isLoading]);

  const visibleSavedTasks = useMemo(() => {
    if (!user) return [];
    return user.role === "admin"
      ? savedTasks
      : savedTasks.filter((task) => task.role === user.role || task.assignee === user.name);
  }, [savedTasks, user]);

  const filteredTasks = useMemo(
    () => filterAndSortSavedTasks(visibleSavedTasks, query, sortField, sortDirection, status),
    [visibleSavedTasks, query, sortField, sortDirection, status]
  );

  const orderedDrafts = useMemo(() => [...drafts].sort((a, b) => b.savedAt.localeCompare(a.savedAt)), [drafts]);

  const closedCount = visibleSavedTasks.filter((task) => getEffectiveProcessStatus(task) === "closed").length;
  const openCount = visibleSavedTasks.filter((task) => getEffectiveProcessStatus(task) === "open").length;

  const openDraft = async (draftId: string) => {
    await dispatch(loadDraftThunk({ draftId }));
    navigate("/designer?mode=draft");
  };

  const openCanvas = async (taskId: string) => {
    await dispatch(openTaskDesignerThunk({ taskId }));
    navigate(`/designer?taskId=${encodeURIComponent(taskId)}`);
  };

  const openPatientRecordView = (taskId: string) => {
    navigate(`/saved-tasks/${taskId}/view`);
  };

  const deleteTaskFromList = async (taskId: string) => {
    const result = await dispatch(deleteTaskThunk({ taskId }));
    if (deleteTaskThunk.fulfilled.match(result)) {
      toast({
        title: "Task deleted",
        description: `Task ${taskId} deleted from open tasks.`,
      });
      return;
    }

    toast({
      title: "Delete blocked",
      description: result.error.message ?? "Task can be deleted only after process END.",
      variant: "destructive",
    });
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-5">
        <h1 className="text-lg font-bold">Saved Tasks</h1>
        <p className="text-xs text-muted-foreground">Task history with process status, timestamps, and draft snapshots.</p>
      </div>

      <Tabs defaultValue="saved_tasks">
        <TabsList className="mb-4 h-9">
          <TabsTrigger value="saved_tasks" className="text-xs">
            Saved Tasks
          </TabsTrigger>
          <TabsTrigger value="draft" className="text-xs">
            Draft
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saved_tasks" className="space-y-4">
          <SavedTasksStats total={visibleSavedTasks.length} open={openCount} closed={closedCount} />

          <SavedTasksFilters
            query={query}
            status={status}
            sortField={sortField}
            sortDirection={sortDirection}
            viewMode={viewMode}
            onQueryChange={setQuery}
            onStatusChange={setStatus}
            onSortFieldChange={setSortField}
            onSortDirectionChange={setSortDirection}
            onViewModeChange={setViewMode}
          />

          {viewMode === "table" ? (
            <SavedTasksTable
              tasks={filteredTasks}
              onOpenCanvas={(taskId) => void openCanvas(taskId)}
              onOpenView={openPatientRecordView}
              onDeleteTask={(taskId) => void deleteTaskFromList(taskId)}
            />
          ) : (
            <SavedTasksCards
              tasks={filteredTasks}
              onOpenCanvas={(taskId) => void openCanvas(taskId)}
              onOpenView={openPatientRecordView}
            />
          )}
        </TabsContent>

        <TabsContent value="draft">
          <DraftsPanel drafts={orderedDrafts} onOpenDraft={(draftId) => void openDraft(draftId)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
