import type { Node } from "@xyflow/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Settings2, Circle, Square, Diamond, Clock, Mail, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PropertiesPanelProps {
  node: Node | null;
  onLabelChange: (id: string, label: string) => void;
  onRoleChange: (id: string, role: string) => void;
  onTypeChange: (id: string, type: string) => void;
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

const SHAPE_OPTIONS = [
  {
    group: "Events",
    items: [
      { type: "startEvent", label: "Start Event", icon: Circle, colorClass: "text-node-start", bgClass: "bg-node-start/15 border-node-start/40" },
      { type: "endEvent", label: "End Event", icon: Circle, colorClass: "text-node-end", bgClass: "bg-node-end/15 border-node-end/40" },
      { type: "timerEvent", label: "Timer Event", icon: Clock, colorClass: "text-node-timer", bgClass: "bg-node-timer/15 border-node-timer/40" },
      { type: "messageEvent", label: "Message Event", icon: Mail, colorClass: "text-node-message", bgClass: "bg-node-message/15 border-node-message/40" },
      { type: "signalEvent", label: "Signal Event", icon: AlertCircle, colorClass: "text-warning", bgClass: "bg-warning/15 border-warning/40" },
    ],
  },
  {
    group: "Tasks",
    items: [
      { type: "userTask", label: "User Task", icon: Square, colorClass: "text-node-task", bgClass: "bg-node-task/10 border-node-task/40" },
    ],
  },
  {
    group: "Gateways",
    items: [
      { type: "xorGateway", label: "XOR Gateway", icon: Diamond, colorClass: "text-node-gateway-xor", bgClass: "bg-node-gateway-xor/15 border-node-gateway-xor/40" },
      { type: "andGateway", label: "AND Gateway", icon: Diamond, colorClass: "text-node-gateway-and", bgClass: "bg-node-gateway-and/10 border-node-gateway-and/40" },
    ],
  },
];

export function PropertiesPanel({ node, onLabelChange, onRoleChange, onTypeChange }: PropertiesPanelProps) {
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
          {/* Shape Selector */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Shape / Type</p>
            <div className="space-y-2">
              {SHAPE_OPTIONS.map((group) => (
                <div key={group.group}>
                  <p className="mb-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60">{group.group}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {group.items.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = node.type === opt.type;
                      return (
                        <button
                          key={opt.type}
                          onClick={() => onTypeChange(node.id, opt.type)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-[10px] font-medium transition-all",
                            isSelected
                              ? `${opt.bgClass} ${opt.colorClass} shadow-sm ring-1 ring-inset ring-current/30`
                              : "border-border bg-background text-muted-foreground hover:bg-muted"
                          )}
                        >
                          <Icon className={cn("h-3 w-3 flex-shrink-0", isSelected ? opt.colorClass : "")} />
                          <span className="leading-tight">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

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

            {node.type === "timerEvent" && (
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
