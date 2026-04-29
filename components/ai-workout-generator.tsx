"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 w-full rounded-xl border border-primary/30 bg-primary/5 py-3 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors active:scale-[0.98]"
      >
        <Sparkles className="h-4 w-4" />
        Generate AI Workout
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={() => !pending && setOpen(false)}
          />

          {/* Bottom sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl bg-card border-t border-border shadow-2xl">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-5 pb-8 flex flex-col gap-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Workout
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Personalised based on your history &amp; how you feel
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Energy level */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground">
                  How&apos;s your energy today?
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(["low", "medium", "high"] as Energy[]).map((e) => (
                    <button
                      key={e}
                      onClick={() => setEnergy(e)}
                      disabled={pending}
                      className={cn(
                        "rounded-xl border py-3 text-sm font-medium transition-colors",
                        energy === e
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      )}
                    >
                      {e === "low" ? "😴 Low" : e === "medium" ? "😊 Medium" : "🔥 High"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus area */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground">
                  What&apos;s the focus?
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {FOCUS_OPTIONS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFocus(f.value)}
                      disabled={pending}
                      className={cn(
                        "rounded-xl border py-3 text-sm font-medium transition-colors",
                        focus === f.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      )}
                    >
                      {f.emoji} {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <Button
                size="lg"
                className="w-full gap-2 font-bold"
                onClick={handleGenerate}
                disabled={pending}
              >
                {pending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Building your workout…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate Workout
                  </>
                )}
              </Button>

              {pending && (
                <p className="text-center text-xs text-muted-foreground -mt-2">
                  Analysing your history and building a personalised session…
                </p>
              )}
              {error && (
                <p className="text-center text-xs text-red-400 -mt-2">{error}</p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
