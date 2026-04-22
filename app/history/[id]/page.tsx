import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getWorkoutDetail } from "@/lib/actions";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { WeightCell, VolumeCell, UnitLabel } from "@/components/weight-display";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function isTimed(val: number | null, weight: number | null, reps: number | null) {
  // If duration is set and weight+reps are not, treat as timed
  return val !== null && weight === null && reps === null;
}

export default async function WorkoutDetailPage({ params }: Props) {
  const { id } = await params;
  const workout = await getWorkoutDetail(id).catch(() => null);
  if (!workout) notFound();

  const allSets = workout.exercises.flatMap((e) => e.sets);
  const completedCount = allSets.filter((s) => s.completed).length;
  const totalCount = allSets.length;

  const totalVolume = allSets.reduce((n, s) => {
    if (!s.completed || !s.weight || !s.reps) return n;
    return n + s.weight * s.reps;
  }, 0);

  return (
    <div className="flex flex-col gap-4 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/history">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground leading-tight">
            {workout.template?.emoji} {workout.template?.name ?? "Workout"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {workout.completedAt
              ? formatDate(new Date(workout.completedAt))
              : "In progress"}
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-3 gap-0.5">
            <span className="text-xl font-black tabular-nums text-foreground">
              {workout.exercises.length}
            </span>
            <span className="text-[10px] text-muted-foreground text-center leading-tight">
              exercises
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-3 gap-0.5">
            <span className="text-xl font-black tabular-nums text-foreground">
              {completedCount}
              <span className="text-sm font-medium text-muted-foreground">
                /{totalCount}
              </span>
            </span>
            <span className="text-[10px] text-muted-foreground text-center leading-tight">
              sets done
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-3 gap-0.5">
            <span className="text-xl font-black tabular-nums text-primary">
              <VolumeCell kgVol={totalVolume} />
            </span>
            <span className="text-[10px] text-muted-foreground text-center leading-tight">
              <UnitLabel /> volume
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Exercise breakdown */}
      {workout.exercises.map((ex) => {
        const exCompleted = ex.sets.filter((s) => s.completed).length;
        return (
          <Card key={ex.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{ex.name}</CardTitle>
                <Badge
                  variant={exCompleted === ex.sets.length ? "default" : "secondary"}
                  className="shrink-0 text-xs"
                >
                  {exCompleted}/{ex.sets.length}
                </Badge>
              </div>
              {ex.notes && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {ex.notes}
                </p>
              )}
            </CardHeader>

            <CardContent>
              {/* Column headers */}
              <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 text-xs font-medium text-muted-foreground mb-2">
                <span className="text-center">Set</span>
                <span className="text-center"><UnitLabel /></span>
                <span className="text-center">Reps</span>
                <span />
              </div>

              <div className="space-y-1.5">
                {ex.sets.map((s) => {
                  const timed = isTimed(s.duration, s.weight, s.reps);

                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 items-center rounded-lg px-1 py-1.5",
                        s.completed ? "bg-primary/10" : "opacity-50"
                      )}
                    >
                      <span
                        className={cn(
                          "text-center text-sm font-bold tabular-nums",
                          s.completed ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {s.setNumber}
                      </span>

                      {timed ? (
                        <>
                          <span className="col-span-2 text-center text-sm font-medium text-foreground">
                            {s.duration}s
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-center text-sm font-medium text-foreground tabular-nums">
                            <WeightCell kg={s.weight} />
                          </span>
                          <span className="text-center text-sm font-medium text-foreground tabular-nums">
                            {s.reps ?? "—"}
                          </span>
                        </>
                      )}

                      <div className="flex justify-center">
                        {s.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
