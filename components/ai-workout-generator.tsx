"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetButton } from "@/components/ui/sheet";
import { generateAiWorkout } from "@/lib/actions";
import { cn } from "@/lib/utils";

type Energy = "low" | "medium" | "high";

const FOCUS_OPTIONS = [
  { label: "Push", emoji: "💪", value: "Push (chest, shoulders, triceps)" },
  { label: "Pull", emoji: "🏋️", value: "Pull (back, biceps)" },
  { label: "Legs", emoji: "🦵", value: "Legs (quads, hamstrings, glutes, calves)" },
  { label: "Upper", emoji: "⬆️", value: "Upper body (chest, back, shoulders, arms)" },
  { label: "Lower", emoji: "⬇️", value: "Lower body (legs and glutes)" },
  { label: "Full Body", emoji: "🔥", value: "Full body (compound movements)" },
];

export function AiWorkoutGenerator() {
  const [open, setOpen] = useState(false);
  const [energy, setEnergy] = useState<Energy>("medium");
  const [focus, setFocus] = useState(FOCUS_OPTIONS[0].value);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateAiWorkout(energy, focus);
      if (result?.error) setError(result.error);
    });
  }

  const choice = (selected: boolean) =>
    cn(
      "flex min-h-[44px] items-center justify-center rounded-[10px] px-2 text-subhead transition-colors",
      selected ? "bg-primary text-primary-foreground font-semibold" : "bg-secondary text-foreground active:bg-accent"
    );

  return (
    <>
      <Button variant="tinted" size="lg" className="w-full" onClick={() => setOpen(true)}>
        <Sparkles />
        Generate with AI
      </Button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="AI Workout"
        dismissible={!pending}
        leading={<SheetButton onClick={() => setOpen(false)} disabled={pending}>Cancel</SheetButton>}
      >
        <div className="flex flex-col gap-6 pt-2">
          <p className="px-1 text-subhead text-muted-foreground">
            Built from your recent history and how you feel today.
          </p>

          <section>
            <p className="ios-section-header">Energy</p>
            <div className="grid grid-cols-3 gap-2">
              {(["low", "medium", "high"] as Energy[]).map((e) => (
                <button key={e} type="button" onClick={() => setEnergy(e)} disabled={pending} className={choice(energy === e)}>
                  {e === "low" ? "😴 Low" : e === "medium" ? "😊 Medium" : "🔥 High"}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="ios-section-header">Focus</p>
            <div className="grid grid-cols-3 gap-2">
              {FOCUS_OPTIONS.map((f) => (
                <button key={f.value} type="button" onClick={() => setFocus(f.value)} disabled={pending} className={choice(focus === f.value)}>
                  {f.emoji} {f.label}
                </button>
              ))}
            </div>
          </section>

          <div className="flex flex-col gap-2">
            <Button size="lg" className="w-full" onClick={handleGenerate} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {pending ? "Building Your Workout…" : "Generate Workout"}
            </Button>
            {pending && (
              <p className="text-center text-footnote text-muted-foreground">
                Analysing your history and building a session…
              </p>
            )}
            {error && <p className="text-center text-footnote text-destructive">{error}</p>}
          </div>
        </div>
      </Sheet>
    </>
  );
}
