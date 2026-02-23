import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, Play, CheckCircle, History, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { publishDesignerThunk, saveDraftThunk } from "@/store/slices/workflowSlice";
import { validateDesignerGraphPayload } from "@/data/bpmnValidation";
import type { DesignerGraphEdge, DesignerGraphNode, DesignerGraphPayload } from "@/data/mockData";

export function DesignerToolbar() {
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const nodes = useAppSelector((state) => state.workflow.designerNodes);
  const edges = useAppSelector((state) => state.workflow.designerEdges);

  const handleSave = async () => {
    const result = await dispatch(saveDraftThunk());
    if (saveDraftThunk.fulfilled.match(result)) {
      setSaved(true);
      toast({ title: "Process saved", description: "Draft saved successfully." });
      setTimeout(() => setSaved(false), 3000);
      return;
    }
    toast({
      title: "Save blocked by BPMN rules",
      description: result.error.message ?? "Draft contains invalid BPMN structure.",
      variant: "destructive",
    });
  };

  const handleValidate = () => {
    const graph: DesignerGraphPayload = {
      nodes: nodes as unknown as DesignerGraphNode[],
      edges: edges as unknown as DesignerGraphEdge[],
    };
    const result = validateDesignerGraphPayload(graph, "publish");
    if (result.valid) {
      toast({ title: "Validation passed", description: `All ${nodes.length} nodes satisfy BPMN subset publish rules.` });
      return;
    }

    toast({
      title: "Validation failed",
      description: result.errors.slice(0, 2).join(" "),
      variant: "destructive",
    });
  };

  const handlePublish = async () => {
    const result = await dispatch(publishDesignerThunk());
    if (publishDesignerThunk.fulfilled.match(result)) {
      toast({ title: "Process published", description: "Emergency Triage published. Task Console synced from user tasks." });
      return;
    }
    toast({
      title: "Publish blocked by BPMN rules",
      description: result.error.message ?? "Graph does not pass BPMN subset validation.",
      variant: "destructive",
    });
  };

  return (
    <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">Emergency Triage</p>
          <Badge variant="outline" className="text-[10px] h-5">v4 (draft)</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground">key: emergency_triage · definition-service</p>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
        <History className="h-3.5 w-3.5" />
        History
      </Button>

      <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleValidate}>
        <CheckCircle className="h-3.5 w-3.5" />
        Validate
      </Button>

      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleSave}>
        <Save className="h-3.5 w-3.5" />
        {saved ? "Saved!" : "Save Draft"}
      </Button>

      <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handlePublish}>
        <Play className="h-3.5 w-3.5" />
        Publish
        <ChevronDown className="h-3 w-3" />
      </Button>
    </div>
  );
}
