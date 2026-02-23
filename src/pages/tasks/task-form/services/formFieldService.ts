import type { Task } from "@/data/mockData";

type FormField = Task["formFields"][number];
type FormValues = Record<string, string | boolean>;

export const buildRequiredFieldErrors = (formFields: FormField[], values: FormValues): Record<string, string> => {
  const nextErrors: Record<string, string> = {};

  for (const field of formFields) {
    if (!field.required) continue;

    const value = values[field.id];
    if (field.type === "boolean") {
      if (typeof value !== "boolean") {
        nextErrors[field.id] = "This field is required.";
      }
      continue;
    }

    if (typeof value !== "string" || value.trim().length === 0) {
      nextErrors[field.id] = "This field is required.";
    }
  }

  return nextErrors;
};

export const findFirstStringFieldValue = (
  formFields: FormField[],
  values: FormValues,
  candidates: string[],
  labelHints: string[]
): string | undefined => {
  for (const candidate of candidates) {
    const value = values[candidate];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  for (const field of formFields) {
    const fieldLabel = field.label.toLowerCase();
    if (!labelHints.some((hint) => fieldLabel.includes(hint))) continue;

    const value = values[field.id];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
};
