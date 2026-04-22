import Link from "next/link";
import { ArrowLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getExerciseSummaries } from "@/lib/actions";
import { WeightCell } from "@/components/weight-display";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const exercises = await getExerciseSummaries();
  const tracked = exercises.filter((e) => e.hasSets);
  const bodyweight = exercises.filter((e) => !e.hasSets);

  return (
    <div className="flex flex-col gap-5 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-black text-foreground">Muscle Progress</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {exercises.length} exercise{exercises.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
      </div>

      {exercises.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="text-5xl">📈</span>
          <p className="font-semibold text-foreground">Nothing tracked yet</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Complete a few workouts and your strength progression will appear here.
          </p>
          <Button asChild className="mt-2">
            <Link href="/">Start a Workout</Link>
          </Button>
        </div>
      )}

      {/* Weighted exercises */}
      {tracked.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">
            Strength Progression
          </h2>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {tracked.map((ex, i) => {
                const isFirst = i === 0;
                const isLast = i === tracked.length - 1;
                const up = ex.improvement > 0;
                const down = ex.improvement < 0;

                return (
                  <Link
                    key={ex.name}
                    href={`/progress/${encodeURIComponent(ex.name)}`}
                    className="flex items-center gap-4 px-4 py-3.5 hover:bg-accent/50 transition-colors active:bg-accent"
                    style={{
                      borderRadius:
                        isFirst && isLast
                          ? "0.75rem"
                          : isFirst
                          ? "0.75rem 0.75rem 0 0"
                          : isLast
                          ? "0 0 0.75rem 0.75rem"
                          : undefined,
                    }}
                  >
                    {/* Trend icon */}
                    <div
                      className={
                        up
                          ? "text-green-400"
                          : down
                          ? "text-red-400"
                          : "text-muted-foreground"
                      }
                    >
                      {up ? (
                        <TrendingUp className="h-5 w-5" />
                      ) : down ? (
                        <TrendingDown className="h-5 w-5" />
                      ) : (
                        <Minus className="h-5 w-5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {ex.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ex.sessions} session{ex.sessions !== 1 ? "s" : ""} ·{" "}
                        best{" "}
                        <span className="text-foreground font-medium">
                          <WeightCell kg={ex.bestWeight} />
                        </span>
                      </p>
                    </div>

                    {ex.sessions >= 2 && (
                      <span
                        className={`text-sm font-bold tabular-nums shrink-0 ${
                          up
                            ? "text-green-400"
                            : down
                            ? "text-red-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {up ? "+" : ""}
                        {ex.improvement}%
                      </span>
                    )}

                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Bodyweight / timed exercises */}
      {bodyweight.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">
            Bodyweight / Cardio
          </h2>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {bodyweight.map((ex, i) => (
                <Link
                  key={ex.name}
                  href={`/progress/${encodeURIComponent(ex.name)}`}
                  className="flex items-center gap-4 px-4 py-3.5 hover:bg-accent/50 transition-colors active:bg-accent"
                  style={{
                    borderRadius:
                      i === 0 && bodyweight.length === 1
                        ? "0.75rem"
                        : i === 0
                        ? "0.75rem 0.75rem 0 0"
                        : i === bodyweight.length - 1
                        ? "0 0 0.75rem 0.75rem"
                        : undefined,
                  }}
                >
                  <Minus className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {ex.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ex.sessions} session{ex.sessions !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
