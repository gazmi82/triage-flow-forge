import { useEffect, useState } from "react";
import { ChevronsUpDown, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks";
import { ROLE_LABELS } from "@/data/constants";
import type { Role, Task } from "@/data/mockData";
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
  onComplete: (redirectRole: Role) => void;
  onSaveDraft: () => void;
}

export function TaskForm({ task, onComplete, onSaveDraft }: TaskFormProps) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [redirectRole, setRedirectRole] = useState<Role | "">("");
  const [showRedirectAccordion, setShowRedirectAccordion] = useState(true);

  useEffect(() => {
    setValues({});
    setErrors({});
    setRedirectRole("");
    setShowRedirectAccordion(true);
  }, [task.id]);

  const setFieldValue = (fieldId: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const { [fieldId]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    for (const field of task.formFields) {
      if (!field.required) continue;
      const value = values[field.id];
      if (field.type === "boolean") {
        if (typeof value !== "boolean") nextErrors[field.id] = "This field is required.";
        continue;
      }
      if (typeof value !== "string" || value.trim().length === 0) {
        nextErrors[field.id] = "This field is required.";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({
        title: "Missing required fields",
        description: "Complete all required inputs before submitting.",
        variant: "destructive",
      });
      return;
    }
    if (!redirectRole) {
      toast({
        title: "Redirect role required",
        description: "Select the next role before completing the task.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Task completed", description: `"${task.name}" has been completed and the process advanced.` });
    onComplete(redirectRole);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {task.formFields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <Label className="text-xs font-medium">
            {field.label}
            {field.required && <span className="ml-1 text-destructive">*</span>}
          </Label>

          {field.type === "text" && (
            <Input
              className="h-8 text-sm"
              value={typeof values[field.id] === "string" ? values[field.id] : ""}
              onChange={(e) => setFieldValue(field.id, e.target.value)}
              aria-invalid={Boolean(errors[field.id])}
            />
          )}

          {field.type === "number" && (
            <Input
              type="number"
              className="h-8 text-sm"
              value={typeof values[field.id] === "string" ? values[field.id] : ""}
              onChange={(e) => setFieldValue(field.id, e.target.value)}
              aria-invalid={Boolean(errors[field.id])}
            />
          )}

          {field.type === "textarea" && (
            <Textarea
              className="min-h-[72px] text-sm"
              value={typeof values[field.id] === "string" ? values[field.id] : ""}
              onChange={(e) => setFieldValue(field.id, e.target.value)}
              aria-invalid={Boolean(errors[field.id])}
            />
          )}

          {field.type === "select" && (
            <Select
              value={typeof values[field.id] === "string" ? values[field.id] : undefined}
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
                <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" size="sm" className="gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Complete Task
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onSaveDraft}>
          Save Draft
        </Button>
      </div>
    </form>
  );
}
