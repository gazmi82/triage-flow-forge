import { useCallback, useEffect, useState } from "react";
import { ChevronsUpDown, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks";
import { ROLE_LABELS } from "@/data/constants";
import type { Role, Task, TriageColor } from "@/data/mockData";
import type { TaskNodeType } from "@/pages/tasks/types";
import {
  buildRequiredFieldErrors,
  EventConfigService,
  findFirstStringFieldValue,
  GatewayConfigService,
} from "@/pages/tasks/task-form/services";
import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";

interface TaskFormProps {
  task: Task;
  selectedNodeType: TaskNodeType;
  onComplete: (payload: {
    redirectRole: Role;
    branchARole?: Role;
    branchBRole?: Role;
    xorSelectedCondition?: "critical" | "non_critical";
    patientName?: string;
    patientId?: string;
    conditionExpression?: string;
    correlationKey?: string;
    triageColor?: TriageColor;
  }) => Promise<void> | void;
  onSave: (payload: {
    formValues: Record<string, string | boolean>;
    triageColor?: TriageColor;
    patientName?: string;
    patientId?: string;
  }) => Promise<void> | void;
}

export function TaskForm({ task, selectedNodeType, onComplete, onSave }: TaskFormProps) {
  const { toast } = useToast();

  const effectiveFormFields: Task["formFields"] =
    task.formFields.length > 0
      ? task.formFields
      : [
          { id: "patient_name", label: "Patient Name", type: "text", required: true },
          { id: "patient_id", label: "Patient ID", type: "text", required: true },
          { id: "notes", label: "Notes", type: "textarea", required: false },
        ];

  const [values, setValues] = useState<Record<string, string | boolean>>(task.formValues ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [redirectRole, setRedirectRole] = useState<Role | "">("");
  const [showRedirectAccordion, setShowRedirectAccordion] = useState(true);
  const [correlationKey, setCorrelationKey] = useState("");
  const [branchARole, setBranchARole] = useState<Role | "">("");
  const [branchBRole, setBranchBRole] = useState<Role | "">("");
  const [xorSelectedCondition, setXorSelectedCondition] = useState<"critical" | "non_critical" | "">("");
  const [hasSavedSinceLoad, setHasSavedSinceLoad] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const triageColorToStatusLabel = (triageColor?: TriageColor): string | undefined => {
    if (triageColor === "red") return "Immediate";
    if (triageColor === "orange") return "Very urgent";
    if (triageColor === "yellow") return "Urgent";
    if (triageColor === "green") return "Standard";
    if (triageColor === "blue") return "Non-urgent";
    return undefined;
  };

  const resetForm = useCallback(() => {
    const seededValues: Record<string, string | boolean> = { ...(task.formValues ?? {}) };
    if (typeof seededValues.patient_name !== "string") {
      seededValues.patient_name = task.patientName;
    }
    if (typeof seededValues.patient_id !== "string") {
      seededValues.patient_id = task.patientId;
    }
    const triageLabel = triageColorToStatusLabel(task.triageColor);
    if (triageLabel && typeof seededValues.urgency !== "string") {
      seededValues.urgency = triageLabel;
    }
    if (triageLabel && typeof seededValues.severity !== "string") {
      seededValues.severity = triageLabel;
    }
    const seededCorrelationKey =
      typeof seededValues.correlation_key === "string"
        ? seededValues.correlation_key
        : "";
    setValues(seededValues);
    setErrors({});
    setRedirectRole("");
    setShowRedirectAccordion(true);
    setCorrelationKey(seededCorrelationKey);
    setBranchARole("");
    setBranchBRole("");
    setXorSelectedCondition("");
    setHasSavedSinceLoad(false);
    setHasUnsavedChanges(false);
  }, [task.formValues, task.patientId, task.patientName, task.triageColor]);

  useEffect(() => {
    resetForm();
  }, [resetForm, task.id]);

  const setFieldValue = (fieldId: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setHasSavedSinceLoad(false);
    setHasUnsavedChanges(true);
    setErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const { [fieldId]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const validate = () => {
    const nextErrors = buildRequiredFieldErrors(effectiveFormFields, values);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const getStringValue = (fieldId: string): string => {
    const value = values[fieldId];
    return typeof value === "string" ? value : "";
  };

  const redirectRoleFromValues = getStringValue("redirect_role") as Role | "";
  const branchARoleFromValues = getStringValue("branch_a_role") as Role | "";
  const branchBRoleFromValues = getStringValue("branch_b_role") as Role | "";
  const xorConditionFromValues = getStringValue("xor_active_condition") as "critical" | "non_critical" | "";
  const correlationKeyFromValues = getStringValue("correlation_key");
  const effectiveRedirectRole = redirectRole || redirectRoleFromValues;
  const effectiveBranchARole = branchARole || branchARoleFromValues;
  const effectiveBranchBRole = branchBRole || branchBRoleFromValues;
  const effectiveXorCondition = xorSelectedCondition || xorConditionFromValues;
  const effectiveCorrelationKey = correlationKey || correlationKeyFromValues;

  const inferTriageColorFromForm = (): TriageColor | undefined => {
    const candidates = [
      values.urgency,
      values.severity,
      values.triage_status,
      values.triage,
    ]
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim().toLowerCase());

    const match = candidates.find((value) => value.length > 0);
    if (!match) return undefined;

    if (match.includes("immediate") || match.includes("red") || match.includes("critical")) return "red";
    if (match.includes("very urgent") || match.includes("orange")) return "orange";
    if (match.includes("non-urgent") || match.includes("non urgent") || match.includes("blue")) return "blue";
    if (match.includes("standard") || match.includes("standart") || match.includes("green")) return "green";
    if (match.includes("urgent") || match.includes("yellow") || match.includes("high") || match.includes("medium")) return "yellow";
    return undefined;
  };

  const buildSavePayload = () => ({
    formValues: values,
    triageColor: inferTriageColorFromForm(),
    patientName: findFirstStringFieldValue(effectiveFormFields, values, ["patient_name", "patientName"], ["patient name"]),
    patientId: findFirstStringFieldValue(effectiveFormFields, values, ["patient_id", "patientId"], ["patient id"]),
  });

  const handleSave = async () => {
    await onSave(buildSavePayload());
    setHasSavedSinceLoad(true);
    setHasUnsavedChanges(false);
    toast({
      title: "Saved",
      description: "Task updates are now visible on the task card and header.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({
        title: "Missing required fields",
        description: "Complete all required inputs before submitting.",
        variant: "destructive",
      });
      return;
    }
    if (selectedNodeType === "andGateway") {
      if (!effectiveBranchARole || !effectiveBranchBRole) {
        toast({
          title: "AND roles required",
          description: "Assign a role for both Branch A and Branch B before completing the task.",
          variant: "destructive",
        });
        return;
      }
    } else if (selectedNodeType !== "xorGateway" && selectedNodeType !== "endEvent" && !effectiveRedirectRole) {
      toast({
        title: "Redirect role required",
        description: "Select the next role before completing the task.",
        variant: "destructive",
      });
      return;
    }
    if (selectedNodeType === "xorGateway") {
      if (!effectiveBranchARole || !effectiveBranchBRole) {
        toast({
          title: "XOR roles required",
          description: "Assign a role for Critical and Non Critical paths.",
          variant: "destructive",
        });
        return;
      }
      if (!effectiveXorCondition) {
        toast({
          title: "Select active condition",
          description: "Choose whether this completion follows Condition A or Condition B.",
          variant: "destructive",
        });
        return;
      }
    }
    if (selectedNodeType === "messageEvent" && effectiveCorrelationKey.trim().length === 0) {
      toast({
        title: "Correlation key required",
        description: "Message events require a correlation key.",
        variant: "destructive",
      });
      return;
    }
    if (hasUnsavedChanges) {
      toast({
        title: "Save required",
        description: "Save changes before completing this task.",
        variant: "destructive",
      });
      return;
    }
    if (!hasSavedSinceLoad) {
      toast({
        title: "Save required",
        description: "Click Save before completing this task.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Task completed", description: `"${task.name}" has been completed and the process advanced.` });
    await onComplete({
      redirectRole: (effectiveRedirectRole || effectiveBranchARole || effectiveBranchBRole || task.role) as Role,
      branchARole: selectedNodeType === "andGateway" ? (effectiveBranchARole || undefined) : undefined,
      branchBRole: selectedNodeType === "andGateway" ? (effectiveBranchBRole || undefined) : undefined,
      xorSelectedCondition: selectedNodeType === "xorGateway" ? (effectiveXorCondition || undefined) : undefined,
      ...(selectedNodeType === "xorGateway"
        ? {
            branchARole: effectiveBranchARole || undefined,
            branchBRole: effectiveBranchBRole || undefined,
          }
        : null),
      patientName: buildSavePayload().patientName,
      patientId: buildSavePayload().patientId,
      conditionExpression:
        selectedNodeType === "xorGateway"
          ? "critical | non_critical"
          : undefined,
      correlationKey:
        selectedNodeType === "messageEvent"
          ? effectiveCorrelationKey.trim() || undefined
          : undefined,
      triageColor: inferTriageColorFromForm(),
    });
    resetForm();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {effectiveFormFields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <Label className="text-xs font-medium">
            {field.label}
            {field.required && <span className="ml-1 text-destructive">*</span>}
          </Label>

          {field.type === "text" && (
            <Input
              className="h-8 text-sm"
              value={getStringValue(field.id)}
              onChange={(e) => setFieldValue(field.id, e.target.value)}
              aria-invalid={Boolean(errors[field.id])}
            />
          )}

          {field.type === "number" && (
            <Input
              type="number"
              className="h-8 text-sm"
              value={getStringValue(field.id)}
              onChange={(e) => setFieldValue(field.id, e.target.value)}
              aria-invalid={Boolean(errors[field.id])}
            />
          )}

          {field.type === "textarea" && (
            <Textarea
              className="min-h-[72px] text-sm"
              value={getStringValue(field.id)}
              onChange={(e) => setFieldValue(field.id, e.target.value)}
              aria-invalid={Boolean(errors[field.id])}
            />
          )}

          {field.type === "select" && (
            <Select
              value={getStringValue(field.id) || undefined}
              onValueChange={(value) => setFieldValue(field.id, value)}
            >
              <SelectTrigger className="h-8 text-sm" aria-invalid={Boolean(errors[field.id])}>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {field.type === "boolean" && (
            <div className="flex items-center gap-2">
              <Checkbox
                id={field.id}
                checked={values[field.id] === true}
                onCheckedChange={(checked) => setFieldValue(field.id, checked === true)}
                aria-invalid={Boolean(errors[field.id])}
              />
              <label htmlFor={field.id} className="cursor-pointer text-sm">
                Yes
              </label>
            </div>
          )}

          {errors[field.id] && <p className="text-[11px] text-destructive">{errors[field.id]}</p>}
        </div>
      ))}

      <GatewayConfigService
        selectedNodeType={selectedNodeType}
        branchARole={effectiveBranchARole}
        branchBRole={effectiveBranchBRole}
        xorSelectedCondition={xorSelectedCondition}
        onBranchARoleChange={(value) => {
          setBranchARole(value);
          if (value) setFieldValue("branch_a_role", value);
        }}
        onBranchBRoleChange={(value) => {
          setBranchBRole(value);
          if (value) setFieldValue("branch_b_role", value);
        }}
        onXorSelectedConditionChange={(value) => {
          setXorSelectedCondition(value);
          if (value) setFieldValue("xor_active_condition", value);
        }}
      />

      <EventConfigService
        selectedNodeType={selectedNodeType}
        correlationKey={effectiveCorrelationKey}
        onCorrelationKeyChange={(value) => {
          setCorrelationKey(value);
          setFieldValue("correlation_key", value);
        }}
      />

      {selectedNodeType !== "xorGateway" && selectedNodeType !== "andGateway" && selectedNodeType !== "endEvent" && (
      <div className="space-y-2 rounded-md border border-border bg-card p-2.5">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setShowRedirectAccordion((prev) => !prev)}
        >
          <span className="text-xs font-semibold">Redirection Role</span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        {showRedirectAccordion && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Select next role
              <span className="ml-1 text-destructive">*</span>
            </Label>
            <Select
              value={effectiveRedirectRole || undefined}
              onValueChange={(value) => {
                setRedirectRole(value as Role);
                setFieldValue("redirect_role", value);
              }}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Choose role..." />
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
        )}
      </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={handleSave}>
          Save
        </Button>
        <Button type="submit" size="sm" className="gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Complete Task
        </Button>
      </div>
    </form>
  );
}
