import type { TaskNodeType } from "@/pages/tasks/types";
import { Input, Label } from "@/components/ui";

interface EventConfigServiceProps {
  selectedNodeType: TaskNodeType;
  correlationKey: string;
  onCorrelationKeyChange: (value: string) => void;
}

export function EventConfigService({
  selectedNodeType,
  correlationKey,
  onCorrelationKeyChange,
}: EventConfigServiceProps) {
  if (
    selectedNodeType !== "messageEvent" &&
    selectedNodeType !== "timerEvent" &&
    selectedNodeType !== "signalEvent"
  ) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-card p-2.5">
      <p className="text-xs font-semibold">Event Configuration</p>

      {selectedNodeType === "messageEvent" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Correlation Key</Label>
          <Input
            className="h-8 text-sm"
            placeholder="patient_id or order_id"
            value={correlationKey}
            onChange={(e) => onCorrelationKeyChange(e.target.value)}
          />
        </div>
      )}

      {selectedNodeType === "timerEvent" && (
        <p className="text-xs text-muted-foreground">
          Timer event will be inserted before next routed task.
        </p>
      )}
      {selectedNodeType === "signalEvent" && (
        <p className="text-xs text-muted-foreground">
          Signal event will be inserted before next routed task.
        </p>
      )}
    </div>
  );
}
