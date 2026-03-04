import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTime } from "@/lib/formatters";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { bootstrapWorkflowThunk, loadDraftThunk } from "@/store/slices/workflowSlice";
import { FileText, GitBranch } from "lucide-react";

export default function Draft() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const drafts = useAppSelector((state) => state.workflow.drafts);
  const hasBootstrapped = useAppSelector((state) => state.workflow.hasBootstrapped);
  const isLoading = useAppSelector((state) => state.workflow.isLoading);

  useEffect(() => {
    if (!hasBootstrapped && !isLoading) {
      dispatch(bootstrapWorkflowThunk());
    }
  }, [dispatch, hasBootstrapped, isLoading]);

  const orderedDrafts = useMemo(
    () => [...drafts].sort((a, b) => b.savedAt.localeCompare(a.savedAt)),
    [drafts]
  );

  const openDraft = async (draftId: string) => {
    await dispatch(loadDraftThunk({ draftId }));
    navigate("/designer?mode=draft");
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-5">
        <h1 className="text-lg font-bold">Draft</h1>
        <p className="text-xs text-muted-foreground">Saved process drafts from Designer</p>
      </div>

      {orderedDrafts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">No drafts yet</p>
            <p className="text-xs text-muted-foreground">Use Save Draft in Process Designer to create one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {orderedDrafts.map((draft) => (
            <Card key={draft.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm">{draft.name}</CardTitle>
                    <CardDescription className="text-xs">Saved at {formatTime(draft.savedAt)}</CardDescription>
                  </div>
                  <Badge variant="outline">v{draft.version}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <GitBranch className="h-3.5 w-3.5" />
                    {draft.graph.nodes.length} nodes
                  </span>
                  <span>{draft.graph.edges.length} edges</span>
                </div>
                <Button size="sm" onClick={() => openDraft(draft.id)}>
                  Load in Designer
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
