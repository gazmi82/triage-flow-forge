import { ROLE_LABELS } from "@/data/constants";
import type { SavedTaskItem, SortDirection, SortField, ProcessStatus } from "./types";

const isGeneratedPatientName = (name: string) => /^generated from task console$/i.test(name.trim());

export const getEffectiveProcessStatus = (task: Pick<SavedTaskItem, "status" | "processStatus">) =>
  task.processStatus ?? (task.status === "completed" ? "closed" : "open");

export const getTaskTitle = (task: SavedTaskItem) => ROLE_LABELS[task.role];

export const getPatientDisplayName = (task: SavedTaskItem) => {
  if (!isGeneratedPatientName(task.patientName)) return task.patientName;
  return "Patient Name Pending";
};

export const filterAndSortSavedTasks = (
  tasks: SavedTaskItem[],
  query: string,
  sortField: SortField,
  sortDirection: SortDirection,
  status: ProcessStatus
) => {
  return [...tasks]
    .filter((task) => {
      if (status !== "all" && getEffectiveProcessStatus(task) !== status) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        task.name.toLowerCase().includes(q) ||
        task.patientName.toLowerCase().includes(q) ||
        task.patientId.toLowerCase().includes(q) ||
        task.definitionName.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const aValue = new Date(a[sortField] ?? a.createdAt).getTime();
      const bValue = new Date(b[sortField] ?? b.createdAt).getTime();
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    });
};
