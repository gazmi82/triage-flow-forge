import type { TriageColor } from "@/data/contracts";

const TRIAGE_TO_CATEGORY: Record<TriageColor, "urgent" | "non_urgent"> = {
  red: "urgent",
  orange: "urgent",
  yellow: "non_urgent",
  green: "non_urgent",
  blue: "non_urgent",
};

const TRIAGE_TO_PRIORITY: Record<TriageColor, "low" | "medium" | "high" | "critical"> = {
  red: "critical",
  orange: "high",
  yellow: "medium",
  green: "low",
  blue: "low",
};

const TRIAGE_TO_SLA_MINUTES: Record<TriageColor, number> = {
  red: 0,
  orange: 10,
  yellow: 60,
  green: 120,
  blue: 240,
};

export const triageColorToCategory = (color: TriageColor): "urgent" | "non_urgent" =>
  TRIAGE_TO_CATEGORY[color];

export const triageColorToPriority = (
  color: TriageColor
): "low" | "medium" | "high" | "critical" => TRIAGE_TO_PRIORITY[color];

export const triageColorToSlaMinutes = (color: TriageColor): number =>
  TRIAGE_TO_SLA_MINUTES[color];
