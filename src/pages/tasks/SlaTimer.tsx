import { Clock } from "lucide-react";
import { cn, slaBg } from "@/lib";

export function SlaTimer({ minutesRemaining }: { minutesRemaining: number }) {
  const abs = Math.abs(minutesRemaining);
  const label = minutesRemaining < 0 ? `${abs}m overdue` : `${abs}m left`;

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", slaBg(minutesRemaining))}>
      <Clock className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}
