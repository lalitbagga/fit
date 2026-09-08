"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { cancelWorkout } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DiscardWorkoutButton({ workoutId }: { workoutId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDiscard() {
    startTransition(async () => {
      localStorage.removeItem(`workout-draft-${workoutId}`);
      await cancelWorkout(workoutId);
    });
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        Discard
      </Button>

      <Dialog open={open} onOpenChange={(value) => !pending && setOpen(value)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to discard this workout?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            All entered sets, exercise notes, and session notes will be permanently deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              No, keep workout
            </Button>
            <Button variant="destructive" onClick={handleDiscard} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {pending ? "Discarding…" : "Yes, discard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
