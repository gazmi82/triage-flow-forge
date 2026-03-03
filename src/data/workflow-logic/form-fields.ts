import type { FormField, Role } from "@/data/contracts";

const TRIAGE_OPTIONS = ["Immediate", "Very urgent", "Urgent", "Standard", "Non-urgent"];
const BASE_FIELDS: FormField[] = [
  { id: "patient_name", label: "Patient Name", type: "text", required: true },
  { id: "patient_id", label: "Patient ID", type: "text", required: true },
];

export const getFormFieldsForUserTask = (taskName: string, role: Role): FormField[] => {
  const normalized = taskName.trim().toLowerCase();
  const fieldsByRole: Record<Role, FormField[]> = {
    reception: [
      ...BASE_FIELDS,
      { id: "chief_complaint", label: "Chief Complaint", type: "textarea", required: true },
      { id: "registration_notes", label: "Registration Notes", type: "textarea", required: false },
      { id: "handoff_notes", label: "Handoff Notes", type: "textarea", required: false },
    ],
    triage_nurse: [
      ...BASE_FIELDS,
      { id: "vitals", label: "Vital Signs Summary", type: "textarea", required: true },
      { id: "nurse_assessment", label: "Nurse Assessment", type: "textarea", required: true },
      { id: "nurse_treatment", label: "Nurse Treatment", type: "textarea", required: false },
      { id: "nurse_notes", label: "Nurse Notes", type: "textarea", required: false },
      { id: "handoff_notes", label: "Handoff Notes", type: "textarea", required: false },
    ],
    physician: [
      ...BASE_FIELDS,
      { id: "diagnosis", label: "Primary Diagnosis", type: "text", required: true },
      { id: "severity", label: "Severity Level", type: "select", required: true, options: TRIAGE_OPTIONS },
      { id: "treatment_plan", label: "Treatment Plan", type: "textarea", required: false },
      { id: "admit", label: "Admit to Hospital", type: "boolean", required: true },
      { id: "clinical_notes", label: "Clinical Notes", type: "textarea", required: false },
      { id: "handoff_notes", label: "Handoff Notes", type: "textarea", required: false },
    ],
    lab: [
      ...BASE_FIELDS,
      { id: "lab_tests_requested", label: "Lab Tests Requested", type: "textarea", required: true },
      { id: "lab_findings", label: "Lab Findings", type: "textarea", required: false },
      { id: "lab_notes", label: "Lab Notes", type: "textarea", required: false },
      { id: "handoff_notes", label: "Handoff Notes", type: "textarea", required: false },
    ],
    radiology: [
      ...BASE_FIELDS,
      { id: "imaging_requested", label: "Imaging Requested", type: "textarea", required: true },
      { id: "radiology_findings", label: "Radiology Findings", type: "textarea", required: false },
      { id: "radiology_notes", label: "Radiology Notes", type: "textarea", required: false },
      { id: "handoff_notes", label: "Handoff Notes", type: "textarea", required: false },
    ],
    admin: [
      ...BASE_FIELDS,
      { id: "status_summary", label: "Status Summary", type: "textarea", required: false },
      { id: "notes", label: "Notes", type: "textarea", required: false },
    ],
  };

  // Keep legacy behavior for historical "assessment" tasks while preserving role-driven defaults.
  if (role === "physician" && normalized.includes("assessment")) {
    return fieldsByRole.physician;
  }

  return fieldsByRole[role] ?? [{ id: "notes", label: "Execution Notes", type: "textarea", required: false }];
};
