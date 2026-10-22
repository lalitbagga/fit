"use client";

import { useState, useTransition } from "react";
import { cancelWorkout } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { ActionSheet } from "@/components/ui/action-sheet";

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
        size="lg"
        variant="secondary"
        className="px-5 text-destructive"
        onClick={() => setOpen(true)}
      >
        Discard
      </Button>

      <ActionSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Discard this workout?"
        message="All entered sets and notes will be permanently deleted."
        actions={[
          {
            label: pending ? "Discarding…" : "Discard Workout",
            destructive: true,
            pending,
            onSelect: handleDiscard,
          },
        ]}
      />
    </>
  );
}
