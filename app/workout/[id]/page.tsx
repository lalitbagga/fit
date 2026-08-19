import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActiveWorkoutClient } from "@/components/active-workout-client";
import {
  getActiveWorkout,
  getTemplateExerciseTargets,
  getExerciseLibrary,
  getExerciseGifUrls,
} from "@/lib/actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function WorkoutPage({ params }: Props) {
  const { id } = await params;

  const workout = await getActiveWorkout(id).catch(() => null);
  if (!workout) notFound();

  // Already completed → redirect info
  if (workout.completedAt) {
    return (
      <div className="flex flex-col items-center gap-4 pt-24 text-center">
        <span className="text-6xl">✅</span>
        <p className="text-xl font-bold">Workout already saved!</p>
        <Button asChild>
          <Link href="/">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const exerciseNames = workout.exercises.map((e) => e.name);
  const [targets, exerciseLibrary, gifUrls] = await Promise.all([
    workout.templateId
      ? getTemplateExerciseTargets(workout.templateId)
      : Promise.resolve({}),
    getExerciseLibrary(),
    getExerciseGifUrls(exerciseNames),
  ]);

  // Elapsed time display (rough — based on createdAt)
  const startedAt = new Date(workout.createdAt);

  return (
    <div className="flex flex-col gap-4 pt-4 pb-8">
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>

        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground leading-tight truncate">
            {workout.template?.emoji} {workout.template?.name ?? "Workout"}
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Timer className="h-3 w-3" />
            Started{" "}
            {startedAt.toLocaleTimeString("en-AU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* ── Motivational banner ─────────────────────── */}
      <div className="rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-center">
        <p className="text-sm font-medium text-primary">
          💪 Every rep counts. Stay consistent, build the habit.
        </p>
      </div>

      {/* ── Interactive workout logger ───────────────── */}
      <ActiveWorkoutClient
        workoutId={workout.id}
        workoutNotes={workout.notes}
        exercises={workout.exercises}
        targets={targets}
        exerciseLibrary={exerciseLibrary}
        gifUrls={gifUrls}
      />
    </div>
  );
}
