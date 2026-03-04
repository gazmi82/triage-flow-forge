import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

interface DetailItem {
  label: string;
  value: string;
}

interface HighlightItem {
  label: string;
  value: string;
}

interface ListItem {
  id: string;
  title: string;
  subtitle?: string;
  statusLabel: string;
  statusVariant?: "default" | "secondary" | "outline" | "destructive";
}

interface CardDetailsConfig {
  title: string;
  description?: string;
  details: DetailItem[];
  highlight?: HighlightItem;
}

interface CardListConfig {
  title: string;
  description?: string;
  emptyText: string;
  items: ListItem[];
}

interface OverviewSplitSectionProps {
  detailsCard: CardDetailsConfig;
  listCard: CardListConfig;
}

export function OverviewSplitSection({ detailsCard, listCard }: OverviewSplitSectionProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{detailsCard.title}</CardTitle>
          {detailsCard.description ? <CardDescription>{detailsCard.description}</CardDescription> : null}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            {detailsCard.details.map((detail) => (
              <div key={detail.label} className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">{detail.label}</p>
                <p className="font-medium">{detail.value}</p>
              </div>
            ))}
          </div>
          {detailsCard.highlight ? (
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">{detailsCard.highlight.label}</p>
              <p className="text-sm font-medium">{detailsCard.highlight.value}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{listCard.title}</CardTitle>
          {listCard.description ? <CardDescription>{listCard.description}</CardDescription> : null}
        </CardHeader>
        <CardContent className="space-y-2">
          {listCard.items.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">{listCard.emptyText}</p>
          ) : (
            listCard.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  {item.subtitle ? <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p> : null}
                </div>
                <Badge variant={item.statusVariant ?? "secondary"}>{item.statusLabel}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
