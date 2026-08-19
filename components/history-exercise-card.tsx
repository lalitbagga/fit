"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UnitLabel, WeightCell } from "@/components/weight-display";
import { deleteHistoryExercise, updateHistoryExercise } from "@/lib/actions";
import { cn } from "@/lib/utils";

type SetData = {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  duration: number | null;
  completed: boolean;
};

type ExerciseData = {
  id: string;
  name: string;
  notes: string | null;
  sets: SetData[];
};

type EditableSet = {
  weight: string;
  reps: string;
  duration: string;
  completed: boolean;
};

function isTimed(duration: number | null, weight: number | null, reps: number | null) {
  return duration !== null && weight === null && reps === null;
}

function initialSets(exercise: ExerciseData): Record<string, EditableSet> {
  return Object.fromEntries(
    exercise.sets.map((set) => [
      set.id,
      {
        weight: set.weight?.toString() ?? "",
        reps: set.reps?.toString() ?? "",
        duration: set.duration?.toString() ?? "",
        completed: set.completed,
      },
    ])
  );
}

function optionalNumber(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function HistoryExerciseCard({ exercise }: { exercise: ExerciseData }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(exercise.name);
  const [notes, setNotes] = useState(exercise.notes ?? "");
  const [sets, setSets] = useState(() => initialSets(exercise));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const completed = exercise.sets.filter((set) => set.completed).length;

  function openEditor() {
    setName(exercise.name);
    setNotes(exercise.notes ?? "");
    setSets(initialSets(exercise));
    setError(null);
    setEditOpen(true);
  }

  function updateSet(setId: string, field: keyof EditableSet, value: string | boolean) {
    setSets((current) => ({
      ...current,
      [setId]: { ...current[setId], [field]: value },
    }));
  }

  function handleSave() {
    if (!name.trim()) {
      setError("Exercise name is required.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await updateHistoryExercise(exercise.id, {
        name,
        notes,
        sets: exercise.sets.map((set) => ({
          setId: set.id,
          weight: optionalNumber(sets[set.id].weight),
          reps: optionalNumber(sets[set.id].reps),
          duration: optionalNumber(sets[set.id].duration),
          completed: sets[set.id].completed,
        })),
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setEditOpen(false);
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteHistoryExercise(exercise.id);
      if (result.error) {
        setError(result.error);
        return;
      }

      setDeleteOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="min-w-0 flex-1 truncate text-base">{exercise.name}</CardTitle>
            <div className="flex shrink-0 items-center gap-1">
              <Badge
                variant={completed === exercise.sets.length ? "default" : "secondary"}
                className="mr-1 text-xs"
              >
                {completed}/{exercise.sets.length}
              </Badge>
              <button
                type="button"
                onClick={openEditor}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label={`Edit ${exercise.name}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => { setError(null); setDeleteOpen(true); }}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Delete ${exercise.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          {exercise.notes && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{exercise.notes}</p>
          )}
        </CardHeader>

        <CardContent>
          <div className="mb-2 grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 text-xs font-medium text-muted-foreground">
            <span className="text-center">Set</span>
            <span className="text-center"><UnitLabel /></span>
            <span className="text-center">Reps</span>
            <span />
          </div>

          <div className="space-y-1.5">
            {exercise.sets.map((set) => {
              const timed = isTimed(set.duration, set.weight, set.reps);
              return (
                <div
                  key={set.id}
                  className={cn(
                    "grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2 rounded-lg px-1 py-1.5",
                    set.completed ? "bg-primary/10" : "opacity-50"
                  )}
                >
                  <span className={cn("text-center text-sm font-bold tabular-nums", set.completed ? "text-primary" : "text-muted-foreground")}>{set.setNumber}</span>
                  {timed ? (
                    <span className="col-span-2 text-center text-sm font-medium text-foreground">{set.duration}s</span>
                  ) : (
                    <>
                      <span className="text-center text-sm font-medium tabular-nums text-foreground"><WeightCell kg={set.weight} /></span>
                      <span className="text-center text-sm font-medium tabular-nums text-foreground">{set.reps ?? "—"}</span>
                    </>
                  )}
                  <div className="flex justify-center">
                    {set.completed ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={(open) => !pending && setEditOpen(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit exercise</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor={`exercise-name-${exercise.id}`} className="text-xs font-medium text-muted-foreground">Name</label>
              <Input id={`exercise-name-${exercise.id}`} value={name} onChange={(event) => setName(event.target.value)} disabled={pending} />
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem] gap-2 text-[11px] font-medium text-muted-foreground">
                <span className="text-center">Set</span>
                <span className="text-center">lb</span>
                <span className="text-center">Reps</span>
                <span className="text-center">Sec</span>
                <span className="text-center">Done</span>
              </div>
              {exercise.sets.map((set) => (
                <div key={set.id} className={cn("grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem] items-center gap-2 rounded-lg p-1", sets[set.id].completed && "bg-primary/10")}>
                  <span className="text-center text-sm font-bold text-muted-foreground">{set.setNumber}</span>
                  <Input type="number" inputMode="decimal" min="0" aria-label={`Set ${set.setNumber} weight`} className="h-10 px-1 text-center" value={sets[set.id].weight} onChange={(event) => updateSet(set.id, "weight", event.target.value)} disabled={pending} />
                  <Input type="number" inputMode="numeric" min="0" step="1" aria-label={`Set ${set.setNumber} reps`} className="h-10 px-1 text-center" value={sets[set.id].reps} onChange={(event) => updateSet(set.id, "reps", event.target.value)} disabled={pending} />
                  <Input type="number" inputMode="numeric" min="0" step="1" aria-label={`Set ${set.setNumber} duration`} className="h-10 px-1 text-center" value={sets[set.id].duration} onChange={(event) => updateSet(set.id, "duration", event.target.value)} disabled={pending} />
                  <button type="button" onClick={() => updateSet(set.id, "completed", !sets[set.id].completed)} disabled={pending} className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-muted" aria-label={sets[set.id].completed ? `Mark set ${set.setNumber} incomplete` : `Mark set ${set.setNumber} complete`}>
                    {sets[set.id].completed ? <CheckCircle2 className="h-6 w-6 text-primary" /> : <Circle className="h-6 w-6 text-muted-foreground" />}
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <label htmlFor={`exercise-notes-${exercise.id}`} className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea id={`exercise-notes-${exercise.id}`} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} disabled={pending} placeholder="Add a note…" className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50" />
            </div>

            {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={pending}>Cancel</Button>
            <Button onClick={handleSave} disabled={pending || !name.trim()}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={(open) => !pending && setDeleteOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {exercise.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">All sets for this exercise will be permanently removed from this workout and your progress.</p>
          {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={pending}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? "Deleting…" : "Delete exercise"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
