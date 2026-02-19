import type { Node } from "@xyflow/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Settings2 } from "lucide-react";

interface PropertiesPanelProps {
  node: Node | null;
  onLabelChange: (id: string, label: string) => void;
  onRoleChange: (id: string, role: string) => void;
}

const NODE_TYPE_LABELS: Record<string, string> = {
  startEvent: "Start Event",
  endEvent: "End Event",
  userTask: "User Task",
  xorGateway: "XOR Gateway",
  andGateway: "AND Gateway",
  timerEvent: "Timer Event",
  messageEvent: "Message Event",
  signalEvent: "Signal Event",
};

export function PropertiesPanel({ node, onLabelChange, onRoleChange }: PropertiesPanelProps) {
  return (
    <div className="flex w-64 flex-col border-l border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Settings2 className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Properties</p>
      </div>

      {!node ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-center text-xs text-muted-foreground">Select a node to edit its properties</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Element</p>
            <div className="rounded-md bg-muted px-3 py-2">
              <p className="text-xs font-medium">{NODE_TYPE_LABELS[node.type as string] || node.type}</p>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{node.id}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">General</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Label</Label>
              <Input
                className="h-8 text-xs"
                value={String(node.data.label || "")}
                onChange={(e) => onLabelChange(node.id, e.target.value)}
                placeholder="Element label"
              />
            </div>

            {node.type === "userTask" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Assigned Role / Lane</Label>
                <Select value={String(node.data.role || "")} onValueChange={(v) => onRoleChange(node.id, v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Reception">Reception</SelectItem>
                    <SelectItem value="Triage Nurse">Triage Nurse</SelectItem>
                    <SelectItem value="Physician">Physician</SelectItem>
                    <SelectItem value="Laboratory">Laboratory</SelectItem>
                    <SelectItem value="Radiology">Radiology</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(node.type === "timerEvent") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Timer Duration (ISO 8601)</Label>
                <Input className="h-8 text-xs font-mono" placeholder="PT30M" defaultValue="PT30M" />
              </div>
            )}

            {(node.type === "messageEvent" || node.type === "signalEvent") && (
              <div className="space-y-1.5">
                <Label className="text-xs">{node.type === "messageEvent" ? "Message" : "Signal"} Name</Label>
                <Input className="h-8 text-xs" placeholder="e.g. LabResultReceived" />
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Position</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">X</Label>
                <div className="rounded-md bg-muted px-2 py-1 text-xs font-mono">{Math.round(node.position.x)}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Y</Label>
                <div className="rounded-md bg-muted px-2 py-1 text-xs font-mono">{Math.round(node.position.y)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
