import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAllWorkouts } from "@/lib/actions";
import { formatDate } from "@/lib/utils";
import { DeleteWorkoutButton } from "@/components/delete-workout-button";
import { ExportDataButton } from "@/components/export-data-button";

export const dynamic = "force-dynamic";

function totalVolume(
  exercises: { sets: { weight: number | null; reps: number | null; completed: boolean }[] }[]
) {
  return exercises.reduce((total, ex) =>
    total +
    ex.sets.reduce((s, set) => {
      if (!set.completed || !set.weight || !set.reps) return s;
      return s + set.weight * set.reps;
    }, 0),
    0
  );
}

function completedSets(
  exercises: { sets: { completed: boolean }[] }[]
) {
  return exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.completed).length, 0);
}

export default async function HistoryPage() {
  const workouts = await getAllWorkouts();

  // Group by month label e.g. "April 2026"
  const groups: Record<string, typeof workouts> = {};
  for (const w of workouts) {
    const label = new Intl.DateTimeFormat("en-AU", {
      month: "long",
      year: "numeric",
    }).format(new Date(w.completedAt!));
    if (!groups[label]) groups[label] = [];
    groups[label].push(w);
  }

  return (
    <div className="flex flex-col gap-5 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-black text-foreground">Workout History</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {workouts.length} session{workouts.length !== 1 ? "s" : ""} logged
          </p>
        </div>
        <ExportDataButton disabled={workouts.length === 0} />
      </div>

      {workouts.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="text-5xl">📋</span>
          <p className="font-semibold text-foreground">No sessions yet</p>
          <p className="text-sm text-muted-foreground">
            Complete a workout and it will appear here.
          </p>
          <Button asChild className="mt-2">
            <Link href="/">Start a Workout</Link>
          </Button>
        </div>
      )}

      {Object.entries(groups).map(([month, monthWorkouts]) => (
        <section key={month} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">
            {month}
          </h2>

          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {monthWorkouts.map((w, i) => {
                const vol = totalVolume(w.exercises);
                const done = completedSets(w.exercises);
                const total = w.exercises.reduce((n, ex) => n + ex.sets.length, 0);
                const radius =
                  i === 0 && monthWorkouts.length === 1
                    ? "0.75rem"
                    : i === 0
                    ? "0.75rem 0.75rem 0 0"
                    : i === monthWorkouts.length - 1
                    ? "0 0 0.75rem 0.75rem"
                    : undefined;

                return (
                  <div key={w.id} className="flex items-center" style={{ borderRadius: radius }}>
                    <Link
                      href={`/history/${w.id}`}
                      className="flex flex-1 items-center gap-4 px-4 py-3.5 hover:bg-accent/50 transition-colors active:bg-accent min-w-0"
                      style={{ borderRadius: radius }}
                    >
                      <span className="text-2xl shrink-0">
                        {w.template?.emoji ?? "💪"}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {w.template?.name ?? "Workout"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(new Date(w.completedAt!))}
                          {" · "}
                          {done}/{total} sets
                          {vol > 0 && (
                            <>
                              {" · "}
                              <span className="text-primary font-medium">
                                {vol.toLocaleString()} kg vol
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                    <div className="pr-3">
                      <DeleteWorkoutButton workoutId={w.id} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>
      ))}
    </div>
  );
}
