import { useMemo, useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { ROLE_LABELS } from "@/data/constants";
import type { Role } from "@/data/contracts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import type { TaskNodeType } from "@/pages/tasks/types";

interface NodeConfigFormProps {
  nodeType: TaskNodeType;
  onCreate: (payload: {
    label: string;
    conditionExpression?: string;
    correlationKey?: string;
    redirectRole?: Role;
  }) => void;
}

const DEFAULT_LABELS: Record<TaskNodeType, string> = {
  startEvent: "Start",
  endEvent: "End",
  timerEvent: "SLA Wait",
  messageEvent: "Result Received",
  signalEvent: "Escalation Signal",
  userTask: "User Task",
  xorGateway: "Decision",
  andGateway: "Parallel Split",
};

export function NodeConfigForm({ nodeType, onCreate }: NodeConfigFormProps) {
  const [label, setLabel] = useState(DEFAULT_LABELS[nodeType]);
  const [condA, setCondA] = useState("");
  const [condB, setCondB] = useState("");
  const [correlationKey, setCorrelationKey] = useState("");
  const [redirectRole, setRedirectRole] = useState<Role | "">("");

  const helper = useMemo(() => {
    if (nodeType === "xorGateway") return "Define at least two outgoing decision conditions.";
    if (nodeType === "andGateway") return "Parallel gateway will split/join concurrent branches.";
    if (nodeType === "timerEvent") return "Timer node represents wait/escalation semantics.";
    if (nodeType === "messageEvent") return "Message node should include a correlation key if available.";
    if (nodeType === "signalEvent") return "Signal node can be used for broadcast-style transition triggers.";
    if (nodeType === "startEvent") return "Start node should be the first node in process flow.";
    if (nodeType === "endEvent") return "End node closes the process branch.";
    return "Configure the selected BPMN node.";
  }, [nodeType]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedLabel = label.trim() || DEFAULT_LABELS[nodeType];
    let conditionExpression: string | undefined;
    if (nodeType === "xorGateway") {
      const c1 = condA.trim();
      const c2 = condB.trim();
      conditionExpression = [c1, c2].filter(Boolean).join(" | ");
    }

    onCreate({
      label: normalizedLabel,
      conditionExpression,
      correlationKey: correlationKey.trim() || undefined,
      redirectRole: redirectRole || undefined,
    });
  };

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4">
      <p className="text-xs text-muted-foreground">{helper}</p>

      <div className="space-y-1.5">
        <Label className="text-xs">Node Label</Label>
        <Input className="h-8 text-sm" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>

      {nodeType === "xorGateway" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Condition A</Label>
            <Input className="h-8 text-sm" value={condA} onChange={(e) => setCondA(e.target.value)} placeholder="critical" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Condition B</Label>
            <Input className="h-8 text-sm" value={condB} onChange={(e) => setCondB(e.target.value)} placeholder="non_critical" />
          </div>
        </>
      )}

      {nodeType === "messageEvent" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Correlation Key</Label>
          <Input
            className="h-8 text-sm"
            value={correlationKey}
            onChange={(e) => setCorrelationKey(e.target.value)}
            placeholder="patient_id or order_id"
          />
        </div>
      )}

      {nodeType !== "endEvent" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Redirect Role (next user task)</Label>
          <Select value={redirectRole || undefined} onValueChange={(value) => setRedirectRole(value as Role)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Choose role..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reception">{ROLE_LABELS.reception}</SelectItem>
              <SelectItem value="triage_nurse">{ROLE_LABELS.triage_nurse}</SelectItem>
              <SelectItem value="physician">{ROLE_LABELS.physician}</SelectItem>
              <SelectItem value="lab">{ROLE_LABELS.lab}</SelectItem>
              <SelectItem value="radiology">{ROLE_LABELS.radiology}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Button type="submit" size="sm" className="h-8 text-xs">
        Create Node & Advance
      </Button>
    </form>
  );
}
