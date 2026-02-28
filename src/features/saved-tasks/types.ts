import type { SavedTaskRecord } from "@/data/contracts";

export type SortField = "createdAt" | "updatedAt";
export type SortDirection = "asc" | "desc";
export type ViewMode = "table" | "cards";
export type ProcessStatus = "all" | "open" | "closed";

export type SavedTaskItem = SavedTaskRecord;
