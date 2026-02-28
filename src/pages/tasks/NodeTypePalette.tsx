import { useEffect, useState } from "react";
import { AlertTriangle, ChevronsUpDown, Circle, Clock, Diamond, Mail, Square } from "lucide-react";
import { ROLE_LABELS } from "@/data/constants";
import type { Role, TriageColor } from "@/data/contracts";
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { cn } from "@/lib";
import { getDefaultNodeLabel, type TaskNodeType } from "@/pages/tasks/types";

interface NodeTypePaletteProps {
  selected: TaskNodeType;
  onSelect: (value: TaskNodeType) => void;
  onConfigChange: (payload: { nodeType: TaskNodeType; label: string; triageColor: TriageColor }) => void;
  currentRole: Role;
}

export function NodeTypePalette({ selected, onSelect, onConfigChange, currentRole }: NodeTypePaletteProps) {
  const [open, setOpen] = useState(true);
  const [taskLabel, setTaskLabel] = useState(getDefaultNodeLabel(selected));
  const [triageColor, setTriageColor] = useState<TriageColor>("yellow");

  useEffect(() => {
    setTaskLabel(getDefaultNodeLabel(selected));
  }, [selected]);

  useEffect(() => {
    onConfigChange({
      nodeType: selected,
      label: taskLabel.trim() || getDefaultNodeLabel(selected),
      triageColor,
    });
  }, [onConfigChange, selected, taskLabel, triageColor]);

  const buttonClass = (value: TaskNodeType, tint: string) =>
    cn(
      "flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs font-semibold transition-colors",
      selected === value ? tint : "border-border bg-card hover:bg-muted/50"
    );

  return (
    <div className="border-t border-border bg-card p-3">
      <button
        className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-xs font-semibold"
        onClick={() => setOpen((prev) => !prev)}
      >
        Shape / Type
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Events</p>
            <div className="grid grid-cols-2 gap-2">
              <button className={buttonClass("startEvent", "border-success/40 bg-success/10 text-success")} onClick={() => onSelect("startEvent")}><Circle className="h-3.5 w-3.5" />Start</button>
              <button className={buttonClass("endEvent", "border-destructive/40 bg-destructive/10 text-destructive")} onClick={() => onSelect("endEvent")}><Circle className="h-3.5 w-3.5" />End</button>
              <button className={buttonClass("timerEvent", "border-info/40 bg-info/10 text-info")} onClick={() => onSelect("timerEvent")}><Clock className="h-3.5 w-3.5" />Timer</button>
              <button className={buttonClass("messageEvent", "border-accent/40 bg-accent/10 text-accent")} onClick={() => onSelect("messageEvent")}><Mail className="h-3.5 w-3.5" />Message</button>
              <button className={buttonClass("signalEvent", "border-warning/40 bg-warning/10 text-warning")} onClick={() => onSelect("signalEvent")}><AlertTriangle className="h-3.5 w-3.5" />Signal</button>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tasks</p>
            <div className="grid grid-cols-2 gap-2">
              <button className={buttonClass("userTask", "border-primary/40 bg-primary/10 text-primary")} onClick={() => onSelect("userTask")}><Square className="h-3.5 w-3.5" />User Task</button>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Gateways</p>
            <div className="grid grid-cols-2 gap-2">
              <button className={buttonClass("xorGateway", "border-node-gateway-xor/40 bg-node-gateway-xor/10 text-node-gateway-xor")} onClick={() => onSelect("xorGateway")}><Diamond className="h-3.5 w-3.5" />XOR</button>
              <button className={buttonClass("andGateway", "border-node-gateway-and/40 bg-node-gateway-and/10 text-node-gateway-and")} onClick={() => onSelect("andGateway")}><Diamond className="h-3.5 w-3.5" />AND</button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Task Label</Label>
            <Input
              className="h-8 text-xs"
              value={taskLabel}
              onChange={(event) => setTaskLabel(event.target.value)}
              placeholder="e.g. Cardiac Arrest - Bay 2"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Emergency Status</Label>
            <Select value={triageColor} onValueChange={(value) => setTriageColor(value as TriageColor)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="red">Immediate (red)</SelectItem>
                <SelectItem value="orange">Very urgent (orange)</SelectItem>
                <SelectItem value="yellow">Urgent (yellow)</SelectItem>
                <SelectItem value="green">Standard (green)</SelectItem>
                <SelectItem value="blue">Non-urgent (blue)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Assigned Role</Label>
            <div className="flex h-8 items-center rounded-md border border-border bg-muted/40 px-2.5 text-xs font-medium">
              {ROLE_LABELS[currentRole]}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
