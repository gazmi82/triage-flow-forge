import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn, formatSlaCountdown, minutesUntilDue, secondsUntilDue, slaBg } from "@/lib";

export function SlaTimer({ dueAt }: { dueAt: string }) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const minutesRemaining = minutesUntilDue(dueAt, nowMs);
  const secondsRemaining = secondsUntilDue(dueAt, nowMs);
  const label = formatSlaCountdown(secondsRemaining);

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", slaBg(minutesRemaining))}>
      <Clock className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}
