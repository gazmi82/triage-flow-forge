import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from "@/components/ui";

interface DistributionRow {
  key: string;
  label: ReactNode;
  value: string | number;
  progress: number;
}

interface DistributionGroup {
  key: string;
  title: string;
  rows: DistributionRow[];
}

interface EntityCardItem {
  id: string;
  title: string;
  status: ReactNode;
  subtitle?: string;
  tags?: ReactNode[];
}

interface WorkloadSplitSectionProps {
  distributionTitle: string;
  distributionDescription?: string;
  distributionGroups: DistributionGroup[];
  trackingTitle: string;
  trackingDescription?: string;
  trackingEmptyText: string;
  trackingItems: EntityCardItem[];
}

export function WorkloadSplitSection({
  distributionTitle,
  distributionDescription,
  distributionGroups,
  trackingTitle,
  trackingDescription,
  trackingEmptyText,
  trackingItems,
}: WorkloadSplitSectionProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr,1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{distributionTitle}</CardTitle>
          {distributionDescription ? <CardDescription>{distributionDescription}</CardDescription> : null}
        </CardHeader>
        <CardContent className="space-y-5">
          {distributionGroups.map((group) => (
            <div key={group.key} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</p>
              {group.rows.map((row) => (
                <div key={row.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">{row.label}</div>
                    <span className="text-xs font-medium">{row.value}</span>
                  </div>
                  <Progress value={row.progress} className="h-1.5" />
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{trackingTitle}</CardTitle>
          {trackingDescription ? <CardDescription>{trackingDescription}</CardDescription> : null}
        </CardHeader>
        <CardContent className="space-y-2">
          {trackingItems.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">{trackingEmptyText}</p>
          ) : (
            trackingItems.map((item) => (
              <div key={item.id} className="rounded-md border border-border p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  {item.status}
                </div>
                {item.subtitle ? <p className="text-xs text-muted-foreground">{item.subtitle}</p> : null}
                {item.tags && item.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {item.tags.map((tag, index) => (
                      <div key={`${item.id}-tag-${index}`}>{tag}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
