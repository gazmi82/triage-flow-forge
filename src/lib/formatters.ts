import { formatDistanceToNow, parseISO } from "date-fns";

export function timeAgo(isoString: string): string {
  try {
    return formatDistanceToNow(parseISO(isoString), { addSuffix: true });
  } catch {
    return isoString;
  }
}

export function formatTime(isoString: string): string {
  try {
    return parseISO(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return isoString;
  }
}

export function slaColor(minutesRemaining: number): string {
  if (minutesRemaining < 0) return "text-destructive";
  if (minutesRemaining < 15) return "text-warning";
  return "text-success";
}

export function slaBg(minutesRemaining: number): string {
  if (minutesRemaining < 0) return "bg-destructive/10 border-destructive/30 text-destructive";
  if (minutesRemaining < 15) return "bg-warning/10 border-warning/30 text-warning";
  return "bg-success/10 border-success/30 text-success";
}
