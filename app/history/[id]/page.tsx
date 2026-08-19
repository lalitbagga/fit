import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getWorkoutDetail } from "@/lib/actions";
import { formatDate } from "@/lib/utils";
import { VolumeCell, UnitLabel } from "@/components/weight-display";
import { HistoryExerciseCard } from "@/components/history-exercise-card";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

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

      {workout.notes && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Warm-up / session notes
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {workout.notes}
            </p>
          </CardContent>
        </Card>
      )}

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
      {workout.exercises.map((exercise) => (
        <HistoryExerciseCard key={exercise.id} exercise={exercise} />
      ))}
    </div>
  );
}
