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

export function formatDateTime(isoString: string): string {
  try {
    return parseISO(isoString).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export function minutesUntilDue(isoString: string, nowMs = Date.now()): number {
  try {
    const dueMs = parseISO(isoString).getTime();
    return Math.floor((dueMs - nowMs) / 60000);
  } catch {
    return 0;
  }
}

export function secondsUntilDue(isoString: string, nowMs = Date.now()): number {
  try {
    const dueMs = parseISO(isoString).getTime();
    return Math.floor((dueMs - nowMs) / 1000);
  } catch {
    return 0;
  }
}

export function formatSlaCountdown(secondsRemaining: number): string {
  const abs = Math.abs(secondsRemaining);
  const minutes = Math.floor(abs / 60);
  const seconds = abs % 60;
  const sec = String(seconds).padStart(2, "0");
  return secondsRemaining < 0 ? `${minutes}m ${sec}s overdue` : `${minutes}m ${sec}s left`;
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
