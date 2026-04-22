import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Dumbbell, Trophy, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExerciseChart } from "@/components/exercise-chart";
import { getExerciseProgressData } from "@/lib/actions";
import { WeightCell, VolumeCell, UnitLabel, WeightDelta } from "@/components/weight-display";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ name: string }> };

export default async function ExerciseProgressPage({ params }: Props) {
  const { name } = await params;
  const exerciseName = decodeURIComponent(name);

  const data = await getExerciseProgressData(exerciseName).catch(() => null);
  if (data === null) notFound();

  const weightData = data.filter((d) => d.maxWeight > 0);
  const bestWeight = weightData.length
    ? Math.max(...weightData.map((d) => d.maxWeight))
    : null;
  const firstWeight = weightData[0]?.maxWeight ?? null;
  const lastWeight = weightData[weightData.length - 1]?.maxWeight ?? null;
  const delta =
    firstWeight !== null && lastWeight !== null ? lastWeight - firstWeight : null;
  const pct =
    delta !== null && firstWeight && firstWeight > 0
      ? Math.round((delta / firstWeight) * 100)
      : null;

  const totalVolume = data.reduce((n, d) => n + d.totalVolume, 0);

  return (
    <div className="flex flex-col gap-4 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/progress">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black text-foreground leading-tight truncate">
            {exerciseName}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data.length} session{data.length !== 1 ? "s" : ""} logged
          </p>
        </div>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-3 gap-0.5">
            <Trophy className="h-4 w-4 text-yellow-400 mb-0.5" />
            <span className="text-xl font-black tabular-nums text-foreground">
              {bestWeight !== null ? <WeightCell kg={bestWeight} /> : "—"}
            </span>
            <span className="text-[10px] text-muted-foreground text-center leading-tight">
              best <UnitLabel />
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-3 gap-0.5">
            <TrendingUp className="h-4 w-4 text-primary mb-0.5" />
            <span
              className={`text-xl font-black tabular-nums ${
                delta !== null && delta > 0
                  ? "text-green-400"
                  : delta !== null && delta < 0
                  ? "text-red-400"
                  : "text-foreground"
              }`}
            >
              {firstWeight !== null && lastWeight !== null
                ? <WeightDelta firstKg={firstWeight} lastKg={lastWeight} />
                : "—"}
            </span>
            <span className="text-[10px] text-muted-foreground text-center leading-tight">
              <UnitLabel /> gained
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-3 gap-0.5">
            <Dumbbell className="h-4 w-4 text-primary mb-0.5" />
            <span className="text-xl font-black tabular-nums text-foreground">
              <VolumeCell kgVol={totalVolume} />
            </span>
            <span className="text-[10px] text-muted-foreground text-center leading-tight">
              <UnitLabel /> total vol
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Improvement callout */}
      {pct !== null && data.length >= 2 && (
        <div
          className={`rounded-xl px-4 py-3 flex items-center justify-between border ${
            pct > 0
              ? "bg-green-500/10 border-green-500/20"
              : pct < 0
              ? "bg-red-500/10 border-red-500/20"
              : "bg-muted border-border"
          }`}
        >
          <div>
            <p
              className={`text-sm font-bold ${
                pct > 0
                  ? "text-green-400"
                  : pct < 0
                  ? "text-red-400"
                  : "text-muted-foreground"
              }`}
            >
              {pct > 0
                ? `+${pct}% stronger since day one 💪`
                : pct < 0
                ? `${pct}% from your first session`
                : "Same weight as your first session"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              <WeightCell kg={firstWeight} /> → <WeightCell kg={lastWeight} />
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <ExerciseChart data={data} />
        </CardContent>
      </Card>

      {/* Session log */}
      {data.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Session Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            <div className="grid grid-cols-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2 border-b border-border">
              <span>Date</span>
              <span className="text-center">Max <UnitLabel /></span>
              <span className="text-right">Volume</span>
            </div>
            {[...data].reverse().map((d, i) => (
              <div
                key={i}
                className="grid grid-cols-3 text-sm px-4 py-2.5 border-b border-border/50 last:border-0"
              >
                <span className="text-muted-foreground">{d.date}</span>
                <span className="text-center font-semibold text-foreground tabular-nums">
                  {d.maxWeight > 0 ? <WeightCell kg={d.maxWeight} /> : "—"}
                </span>
                <span className="text-right text-muted-foreground tabular-nums">
                  <VolumeCell kgVol={d.totalVolume} />
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
