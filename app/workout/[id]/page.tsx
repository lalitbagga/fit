import { notFound } from "next/navigation";
import Link from "next/link";
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

  return (
    <ActiveWorkoutClient
      workoutId={workout.id}
      workoutNotes={workout.notes}
      exercises={workout.exercises}
      targets={targets}
      exerciseLibrary={exerciseLibrary}
      gifUrls={gifUrls}
      title={workout.template?.name ?? workout.templateName ?? "Workout"}
      emoji={workout.template?.emoji ?? workout.templateEmoji ?? null}
      startedAt={new Date(workout.createdAt).toISOString()}
    />
  );
}
