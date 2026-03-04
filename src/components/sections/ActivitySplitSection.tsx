import type { ReactNode } from "react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from "@/components/ui";

interface TimelineItem {
  id: string;
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  time?: string;
}

interface ProgressItem {
  key: string;
  label: string;
  value: number | string;
  progress: number;
}

interface BreakdownItem {
  key: string;
  label: string;
  value: number | string;
}

interface ActivitySplitSectionProps {
  timelineTitle: string;
  timelineDescription?: string;
  timelineEmptyText: string;
  timelineItems: TimelineItem[];
  progressTitle: string;
  progressItems: ProgressItem[];
  breakdownTitle: string;
  breakdownEmptyText: string;
  breakdownItems: BreakdownItem[];
}

export function ActivitySplitSection({
  timelineTitle,
  timelineDescription,
  timelineEmptyText,
  timelineItems,
  progressTitle,
  progressItems,
  breakdownTitle,
  breakdownEmptyText,
  breakdownItems,
}: ActivitySplitSectionProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.8fr,1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{timelineTitle}</CardTitle>
          {timelineDescription ? <CardDescription>{timelineDescription}</CardDescription> : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {timelineItems.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">{timelineEmptyText}</p>
          ) : (
            timelineItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 rounded-md border border-border px-3 py-2">
                {item.icon ? <div className="mt-0.5 rounded-md bg-muted p-1.5">{item.icon}</div> : null}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.subtitle ? <p className="text-xs text-muted-foreground">{item.subtitle}</p> : null}
                </div>
                {item.time ? <p className="shrink-0 text-[11px] text-muted-foreground">{item.time}</p> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{progressTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {progressItems.map((item) => (
              <div key={item.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
                <Progress value={item.progress} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{breakdownTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {breakdownItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">{breakdownEmptyText}</p>
            ) : (
              breakdownItems.map((entry) => (
                <div key={entry.key} className="flex items-center justify-between text-sm">
                  <span>{entry.label}</span>
                  <Badge variant="outline">{entry.value}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
