import type { FormField, Role } from "@/data/mockData";

const TRIAGE_OPTIONS = ["Immediate", "Very urgent", "Urgent", "Standard", "Non-urgent"];

export const getFormFieldsForUserTask = (taskName: string, role: Role): FormField[] => {
  const normalized = taskName.trim().toLowerCase();

  if (normalized.includes("assessment") && role === "physician") {
    return [
      { id: "diagnosis", label: "Primary Diagnosis", type: "text", required: true },
      { id: "severity", label: "Severity Level", type: "select", required: true, options: TRIAGE_OPTIONS },
      { id: "admit", label: "Admit to Hospital", type: "boolean", required: true },
      { id: "notes", label: "Clinical Notes", type: "textarea", required: false },
    ];
  }

  if (normalized.includes("triage") || role === "triage_nurse") {
    return [
      { id: "vitals", label: "Vital Signs Summary", type: "textarea", required: true },
      { id: "urgency", label: "Urgency", type: "select", required: true, options: TRIAGE_OPTIONS },
      { id: "notes", label: "Nurse Notes", type: "textarea", required: false },
    ];
  }

  if (normalized.includes("registration") || role === "reception") {
    return [
      { id: "patient_name", label: "Patient Name", type: "text", required: true },
      { id: "patient_id", label: "Patient ID", type: "text", required: true },
      { id: "notes", label: "Registration Notes", type: "textarea", required: false },
    ];
  }

  return [{ id: "notes", label: "Execution Notes", type: "textarea", required: false }];
};
