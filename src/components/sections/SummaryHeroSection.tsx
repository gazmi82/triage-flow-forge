import type { ReactNode } from "react";
import { Avatar, AvatarFallback, Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from "@/components/ui";

interface ScoreStat {
  label: string;
  value: string | number;
}

interface ScoreConfig {
  title: string;
  description?: string;
  value: number;
  maxLabel?: string;
  progressValue?: number;
  stats: ScoreStat[];
}

interface SummaryHeroSectionProps {
  avatarFallback: string;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  contextTitle: string;
  contextLines: string[];
  score: ScoreConfig;
}

export function SummaryHeroSection({
  avatarFallback,
  title,
  subtitle,
  badges,
  contextTitle,
  contextLines,
  score,
}: SummaryHeroSectionProps) {
  const progressValue = score.progressValue ?? score.value;
  const maxLabel = score.maxLabel ?? "/100";

  return (
    <div className="mb-6 grid gap-4 xl:grid-cols-[2.2fr,1fr]">
      <Card className="border-border/70 bg-gradient-to-r from-card via-card to-primary/5">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border border-border">
                <AvatarFallback className="text-lg font-semibold">{avatarFallback}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{title}</CardTitle>
                {subtitle ? <CardDescription className="mt-1 text-sm">{subtitle}</CardDescription> : null}
                {badges ? <div className="mt-2 flex flex-wrap items-center gap-2">{badges}</div> : null}
              </div>
            </div>

            <div className="rounded-md border border-border bg-card/80 px-3 py-2 text-xs">
              <p className="font-semibold">{contextTitle}</p>
              {contextLines.map((line) => (
                <p key={line} className="text-muted-foreground">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-border/70 bg-card/90">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{score.title}</CardTitle>
          {score.description ? <CardDescription>{score.description}</CardDescription> : null}
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-end justify-between">
            <p className="text-3xl font-bold">{score.value}</p>
            <p className="text-xs text-muted-foreground">{maxLabel}</p>
          </div>
          <Progress value={progressValue} className="h-2" />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {score.stats.map((stat) => (
              <div key={stat.label} className="rounded-md bg-muted/60 p-2">
                <p className="text-muted-foreground">{stat.label}</p>
                <p className="font-semibold">{stat.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
