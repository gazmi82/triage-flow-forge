import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, Play, CheckCircle, History, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function DesignerToolbar() {
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    setSaved(true);
    toast({ title: "Process saved", description: "Draft v4 saved successfully." });
    setTimeout(() => setSaved(false), 3000);
  };

  const handleValidate = () => {
    toast({ title: "Validation passed", description: "All 8 nodes validated against supported BPMN subset.", });
  };

  const handlePublish = () => {
    toast({ title: "Process published", description: "Emergency Triage v4 is now live and accepting instances." });
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
