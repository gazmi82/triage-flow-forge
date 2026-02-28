import { Card, CardContent } from "@/components/ui/card";

interface SavedTasksStatsProps {
  total: number;
  open: number;
  closed: number;
}

export function SavedTasksStats({ total, open, closed }: SavedTasksStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card>
        <CardContent className="p-4">
          <p className="text-[11px] text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{total}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-[11px] text-muted-foreground">Open</p>
          <p className="text-2xl font-bold text-info">{open}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-[11px] text-muted-foreground">Closed</p>
          <p className="text-2xl font-bold text-success">{closed}</p>
        </CardContent>
      </Card>
    </div>
  );
}
