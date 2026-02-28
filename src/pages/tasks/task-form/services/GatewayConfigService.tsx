import { ROLE_LABELS } from "@/data/constants";
import type { Role } from "@/data/contracts";
import type { TaskNodeType } from "@/pages/tasks/types";
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";

interface GatewayConfigServiceProps {
  selectedNodeType: TaskNodeType;
  branchARole: Role | "";
  branchBRole: Role | "";
  xorSelectedCondition: "critical" | "non_critical" | "";
  onBranchARoleChange: (value: Role | "") => void;
  onBranchBRoleChange: (value: Role | "") => void;
  onXorSelectedConditionChange: (value: "critical" | "non_critical" | "") => void;
}

export function GatewayConfigService({
  selectedNodeType,
  branchARole,
  branchBRole,
  xorSelectedCondition,
  onBranchARoleChange,
  onBranchBRoleChange,
  onXorSelectedConditionChange,
}: GatewayConfigServiceProps) {
  if (selectedNodeType !== "xorGateway" && selectedNodeType !== "andGateway") {
    return null;
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-card p-2.5">
      <p className="text-xs font-semibold">Gateway Configuration</p>

      {selectedNodeType === "xorGateway" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Critical Role</Label>
            <Select value={branchARole || undefined} onValueChange={(value) => onBranchARoleChange(value as Role)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Assign role for Critical..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reception">{ROLE_LABELS.reception}</SelectItem>
                <SelectItem value="triage_nurse">{ROLE_LABELS.triage_nurse}</SelectItem>
                <SelectItem value="physician">{ROLE_LABELS.physician}</SelectItem>
                <SelectItem value="lab">{ROLE_LABELS.lab}</SelectItem>
                <SelectItem value="radiology">{ROLE_LABELS.radiology}</SelectItem>
                <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Non Critical Role</Label>
            <Select value={branchBRole || undefined} onValueChange={(value) => onBranchBRoleChange(value as Role)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Assign role for Non Critical..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reception">{ROLE_LABELS.reception}</SelectItem>
                <SelectItem value="triage_nurse">{ROLE_LABELS.triage_nurse}</SelectItem>
                <SelectItem value="physician">{ROLE_LABELS.physician}</SelectItem>
                <SelectItem value="lab">{ROLE_LABELS.lab}</SelectItem>
                <SelectItem value="radiology">{ROLE_LABELS.radiology}</SelectItem>
                <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Active Route
              <span className="ml-1 text-destructive">*</span>
            </Label>
            <Select
              value={xorSelectedCondition || undefined}
              onValueChange={(value) => onXorSelectedConditionChange(value as "critical" | "non_critical")}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Choose route now..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="non_critical">Non Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {selectedNodeType === "andGateway" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Branch A Role</Label>
            <Select value={branchARole || undefined} onValueChange={(value) => onBranchARoleChange(value as Role)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Assign role for Branch A..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reception">{ROLE_LABELS.reception}</SelectItem>
                <SelectItem value="triage_nurse">{ROLE_LABELS.triage_nurse}</SelectItem>
                <SelectItem value="physician">{ROLE_LABELS.physician}</SelectItem>
                <SelectItem value="lab">{ROLE_LABELS.lab}</SelectItem>
                <SelectItem value="radiology">{ROLE_LABELS.radiology}</SelectItem>
                <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Branch B Role</Label>
            <Select value={branchBRole || undefined} onValueChange={(value) => onBranchBRoleChange(value as Role)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Assign role for Branch B..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reception">{ROLE_LABELS.reception}</SelectItem>
                <SelectItem value="triage_nurse">{ROLE_LABELS.triage_nurse}</SelectItem>
                <SelectItem value="physician">{ROLE_LABELS.physician}</SelectItem>
                <SelectItem value="lab">{ROLE_LABELS.lab}</SelectItem>
                <SelectItem value="radiology">{ROLE_LABELS.radiology}</SelectItem>
                <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}
