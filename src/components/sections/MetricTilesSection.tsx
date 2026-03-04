import { Card, CardContent } from "@/components/ui";

interface MetricTile {
  label: string;
  value: string | number;
  description?: string;
}

interface MetricTilesSectionProps {
  items: MetricTile[];
  columnsClassName?: string;
}

export function MetricTilesSection({ items, columnsClassName = "md:grid-cols-2 xl:grid-cols-4" }: MetricTilesSectionProps) {
  return (
    <div className={`mb-6 grid gap-3 ${columnsClassName}`}>
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-2xl font-bold">{item.value}</p>
            {item.description ? <p className="mt-1 text-xs text-muted-foreground">{item.description}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
