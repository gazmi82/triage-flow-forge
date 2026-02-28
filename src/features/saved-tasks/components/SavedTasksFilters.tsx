import { Grid3X3, List, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProcessStatus, SortDirection, SortField, ViewMode } from "../types";

interface SavedTasksFiltersProps {
  query: string;
  status: ProcessStatus;
  sortField: SortField;
  sortDirection: SortDirection;
  viewMode: ViewMode;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: ProcessStatus) => void;
  onSortFieldChange: (value: SortField) => void;
  onSortDirectionChange: (value: SortDirection) => void;
  onViewModeChange: (value: ViewMode) => void;
}

export function SavedTasksFilters({
  query,
  status,
  sortField,
  sortDirection,
  viewMode,
  onQueryChange,
  onStatusChange,
  onSortFieldChange,
  onSortDirectionChange,
  onViewModeChange,
}: SavedTasksFiltersProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 md:flex-row md:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search task, patient, process..."
          className="h-8 pl-8 text-xs"
        />
      </div>

      <Select value={status} onValueChange={(value) => onStatusChange(value as ProcessStatus)}>
        <SelectTrigger className="h-8 w-full text-xs md:w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sortField} onValueChange={(value) => onSortFieldChange(value as SortField)}>
        <SelectTrigger className="h-8 w-full text-xs md:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="createdAt">created_at</SelectItem>
          <SelectItem value="updatedAt">updated_at</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sortDirection} onValueChange={(value) => onSortDirectionChange(value as SortDirection)}>
        <SelectTrigger className="h-8 w-full text-xs md:w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="asc">asc</SelectItem>
          <SelectItem value="desc">desc</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <Button
          variant={viewMode === "table" ? "default" : "outline"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onViewModeChange("table")}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "cards" ? "default" : "outline"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onViewModeChange("cards")}
        >
          <Grid3X3 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
