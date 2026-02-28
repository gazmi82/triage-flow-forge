import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTime } from "@/lib/formatters";
import type { DraftRecord } from "@/data/contracts";

interface DraftsPanelProps {
  drafts: DraftRecord[];
  onOpenDraft: (draftId: string) => void;
}

export function DraftsPanel({ drafts, onOpenDraft }: DraftsPanelProps) {
  if (drafts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-semibold">No drafts yet</p>
          <p className="text-xs text-muted-foreground">Use Save Draft in Process Designer to create one.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {drafts.map((draft) => (
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
            <div className="text-xs text-muted-foreground">
              {draft.graph.nodes.length} nodes · {draft.graph.edges.length} edges
            </div>
            <Button size="sm" onClick={() => onOpenDraft(draft.id)}>
              Canvas
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
