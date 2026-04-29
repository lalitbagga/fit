"use client";

import { useState, useTransition, useEffect } from "react";
import { ArrowLeftRight, CheckCircle2, Circle, Info, Loader2, MessageSquare, Plus, Save, Sparkles, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExerciseCombobox } from "@/components/exercise-combobox";
import { ExerciseGuideModal } from "@/components/exercise-guide-modal";
import {
  saveWorkout,
  cancelWorkout,
  addExerciseToWorkout,
  getWeightRecommendation,
  swapExercise,
  getSwapSuggestions,
  type ExerciseInput,
} from "@/lib/actions";
import { haptic } from "ios-haptics";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  order: number;
  notes: string | null;
  sets: SetData[];
};

type TargetMap = Record<
  string,
  { repsTarget: string; notes: string | null } | undefined
>;

type Props = {
  workoutId: string;
  exercises: ExerciseData[];
  targets: TargetMap;
  exerciseLibrary: string[];
  gifUrls: Record<string, string | null>;
};

type LocalSet = {
  weight: string;
  reps: string;
  duration: string;
  completed: boolean;
};

const REST_SECONDS = 60;

function isTimed(repsTarget: string) {
  return /s$|min/.test(repsTarget);
}

function emptyLocalSet(): LocalSet {
  return { weight: "", reps: "", duration: "", completed: false };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ActiveWorkoutClient({ workoutId, exercises: initialExercises, targets, exerciseLibrary, gifUrls }: Props) {
  const [exercises, setExercises] = useState<ExerciseData[]>(initialExercises);

  const storageKey = `workout-draft-${workoutId}`;

  const [localData, setLocalData] = useState<Record<string, Record<string, LocalSet>>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved).localData;
    } catch {}
    return Object.fromEntries(
      initialExercises.map((ex) => [
        ex.id,
        Object.fromEntries(
          ex.sets.map((s) => [
            s.id,
            {
              weight: s.weight?.toString() ?? "",
              reps: s.reps?.toString() ?? "",
              duration: s.duration?.toString() ?? "",
              completed: s.completed,
            },
          ])
        ),
      ])
    );
  });

  const [notes, setNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved).notes;
    } catch {}
    return Object.fromEntries(initialExercises.map((ex) => [ex.id, ex.notes ?? ""]));
  });
  const [notesOpen, setNotesOpen] = useState<Record<string, boolean>>(
    () => Object.fromEntries(initialExercises.map((ex) => [ex.id, !!ex.notes]))
  );

  // Add-exercise form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSets, setNewSets] = useState("3");
  const [addPending, startAdd] = useTransition();

  const [savePending, startSave] = useTransition();
  const [cancelPending, startCancel] = useTransition();

  // Exercise guide modal
  const [guideExercise, setGuideExercise] = useState<{ name: string; gifUrl: string | null } | null>(null);

  // Exercise swap modal — tracks which exercise is being swapped
  const [swapTarget, setSwapTarget] = useState<ExerciseData | null>(null);
  const [swapName, setSwapName] = useState("");
  const [swapPending, startSwap] = useTransition();
  const [swapSuggestions, setSwapSuggestions] = useState<string[]>([]);
  const [swapSuggestionsError, setSwapSuggestionsError] = useState<string | null>(null);
  const [swapSuggestionsLoading, setSwapSuggestionsLoading] = useState(false);

  const unitLabel = "lb";

  // AI weight recommendations
  const [aiTips, setAiTips] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  // ── Rest timer — use end-timestamp so screen lock doesn't freeze it ────────
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restSeconds, setRestSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (restEndsAt === null) { setRestSeconds(null); return; }

    function tick() {
      const remaining = Math.ceil((restEndsAt! - Date.now()) / 1000);
      if (remaining <= 0) {
        setRestSeconds(0);
        haptic.confirm();
        try {
          const ctx = new AudioContext();
          [0, 0.25].forEach((delay) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.2);
          });
        } catch {}

        const t = setTimeout(() => { setRestEndsAt(null); setRestSeconds(null); }, 1500);
        return () => clearTimeout(t);
      }
      setRestSeconds(remaining);
    }

    tick();
    const interval = setInterval(tick, 500);

    function onVisible() { if (document.visibilityState === "visible") tick(); }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [restEndsAt]);

  // ── Persist draft to localStorage so background/foreground doesn't lose data
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ localData, notes }));
    } catch {}
  }, [localData, notes, storageKey]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalSets = exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const completedCount = exercises.reduce(
    (n, ex) =>
      n + ex.sets.filter((s) => localData[ex.id]?.[s.id]?.completed).length,
    0
  );
  const progress = totalSets > 0 ? (completedCount / totalSets) * 100 : 0;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function updateSet(exId: string, setId: string, field: keyof LocalSet, value: string | boolean) {
    setLocalData((prev) => ({
      ...prev,
      [exId]: {
        ...prev[exId],
        [setId]: { ...prev[exId]?.[setId], [field]: value },
      },
    }));
  }

  function toggleSet(exId: string, setId: string) {
    const wasCompleted = localData[exId]?.[setId]?.completed ?? false;
    updateSet(exId, setId, "completed", !wasCompleted);
    if (!wasCompleted) setRestEndsAt(Date.now() + REST_SECONDS * 1000);
  }

  // ── Add custom exercise ────────────────────────────────────────────────────
  function openAddForm() {
    setNewName("");
    setNewSets("3");
    setShowAddForm(true);
  }

  function handleAdd() {
    const name = newName.trim();
    const num = Math.max(1, Math.min(10, parseInt(newSets, 10) || 3));
    if (!name) return;

    startAdd(async () => {
      const ex = await addExerciseToWorkout(workoutId, name, num);
      setExercises((prev) => [...prev, ex]);
      setLocalData((prev) => ({
        ...prev,
        [ex.id]: Object.fromEntries(ex.sets.map((s) => [s.id, emptyLocalSet()])),
      }));
      setNotes((prev) => ({ ...prev, [ex.id]: "" }));
      setNotesOpen((prev) => ({ ...prev, [ex.id]: false }));
      setShowAddForm(false);
    });
  }

  // ── Swap exercise ──────────────────────────────────────────────────────────
  function handleSwap() {
    if (!swapTarget || !swapName.trim()) return;
    startSwap(async () => {
      const updated = await swapExercise(workoutId, swapTarget.id, swapName.trim());
      setExercises((prev) =>
        prev.map((ex) => (ex.id === updated.id ? updated : ex))
      );
      setLocalData((prev) => ({
        ...prev,
        [updated.id]: Object.fromEntries(
          updated.sets.map((s) => [
            s.id,
            {
              weight: s.weight?.toString() ?? "",
              reps: s.reps?.toString() ?? "",
              duration: s.duration?.toString() ?? "",
              completed: false,
            },
          ])
        ),
      }));
      setNotes((prev) => ({ ...prev, [updated.id]: "" }));
      setSwapTarget(null);
      setSwapName("");
    });
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  function handleSave() {
    const payload: ExerciseInput[] = exercises.map((ex) => ({
      exerciseId: ex.id,
      notes: notes[ex.id] ?? "",
      sets: ex.sets.map((s) => {
        const ls = localData[ex.id]?.[s.id];
        return {
          setId: s.id,
          weight: ls?.weight ? parseFloat(ls.weight) : null,
          reps: ls?.reps ? parseInt(ls.reps, 10) : null,
          duration: ls?.duration ? parseInt(ls.duration, 10) : null,
          completed: ls?.completed ?? false,
        };
      }),
    }));
    startSave(async () => {
      localStorage.removeItem(storageKey);
      await saveWorkout(workoutId, payload);
    });
  }

  function handleCancel() {
    startCancel(async () => {
      localStorage.removeItem(storageKey);
      await cancelWorkout(workoutId);
    });
  }

  async function fetchAiTip(exId: string, exName: string, repsTarget: string) {
    if (aiTips[exId] || aiLoading[exId]) return;
    setAiLoading((prev) => ({ ...prev, [exId]: true }));
    try {
      const tip = await getWeightRecommendation(exName, repsTarget);
      setAiTips((prev) => ({ ...prev, [exId]: tip }));
    } finally {
      setAiLoading((prev) => ({ ...prev, [exId]: false }));
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {completedCount} / {totalSets} sets done
          </span>
          <span className="font-medium text-foreground">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Exercise cards */}
      {exercises.map((ex) => {
        const target = targets[ex.name];
        const timed = isTimed(target?.repsTarget ?? "");

        return (
          <Card key={ex.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-snug">{ex.name}</CardTitle>
                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                  {!target && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/15 px-2 py-0.5 rounded-full">
                      Custom
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSwapTarget(ex);
                      setSwapName("");
                      setSwapSuggestions([]);
                      setSwapSuggestionsError(null);
                      setSwapSuggestionsLoading(true);
                      getSwapSuggestions(ex.name).then(({ suggestions, error }) => {
                        setSwapSuggestions(suggestions);
                        setSwapSuggestionsError(error ?? null);
                        setSwapSuggestionsLoading(false);
                      }).catch(() => setSwapSuggestionsLoading(false));
                    }}
                    className="p-1 rounded-md text-muted-foreground hover:text-primary transition-colors"
                    aria-label={`Swap ${ex.name}`}
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => fetchAiTip(ex.id, ex.name, target?.repsTarget ?? "")}
                    className="p-1 rounded-md text-muted-foreground hover:text-primary transition-colors"
                    aria-label={`AI weight tip for ${ex.name}`}
                    disabled={aiLoading[ex.id]}
                  >
                    {aiLoading[ex.id]
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Sparkles className="h-4 w-4" />
                    }
                  </button>
                  <button
                    onClick={() => setGuideExercise({ name: ex.name, gifUrl: gifUrls[ex.name] ?? null })}
                    className="p-1 rounded-md text-muted-foreground hover:text-primary transition-colors"
                    aria-label={`How to do ${ex.name}`}
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {target && (
                <p className="text-xs text-muted-foreground">
                  Target: {ex.sets.length}×{target.repsTarget}
                  {target.notes ? ` · ${target.notes}` : ""}
                </p>
              )}
              {aiTips[ex.id] && (
                <div className="flex items-start gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 mt-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-primary leading-relaxed">{aiTips[ex.id]}</p>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-2 pb-3">
              {/* Column headers */}
              <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 text-xs font-medium text-muted-foreground mb-1">
                <span className="text-center">Set</span>
                {timed ? (
                  <span className="col-span-2 text-center">Duration (s)</span>
                ) : (
                  <>
                    <span className="text-center">{unitLabel}</span>
                    <span className="text-center">Reps</span>
                  </>
                )}
                <span className="text-center">Done</span>
              </div>

              {ex.sets.map((s) => {
                const ls = localData[ex.id]?.[s.id];
                const done = ls?.completed ?? false;

                return (
                  <div
                    key={s.id}
                    className={cn(
                      "grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 items-center rounded-lg px-1 py-1 transition-colors",
                      done && "bg-primary/10"
                    )}
                  >
                    <span
                      className={cn(
                        "text-center text-sm font-bold tabular-nums",
                        done ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {s.setNumber}
                    </span>

                    {timed ? (
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="sec"
                        className="col-span-2 h-10 text-center text-base font-medium"
                        value={ls?.duration ?? ""}
                        onChange={(e) => updateSet(ex.id, s.id, "duration", e.target.value)}
                      />
                    ) : (
                      <>
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder={unitLabel}
                          className="h-10 text-center text-base font-medium"
                          value={ls?.weight ?? ""}
                          onChange={(e) => updateSet(ex.id, s.id, "weight", e.target.value)}
                        />
                        <Input
                          type="number"
                          inputMode="numeric"
                          placeholder="reps"
                          className="h-10 text-center text-base font-medium"
                          value={ls?.reps ?? ""}
                          onChange={(e) => updateSet(ex.id, s.id, "reps", e.target.value)}
                        />
                      </>
                    )}

                    <button
                      className="flex justify-center items-center h-10 w-10 rounded-lg transition-colors hover:bg-muted active:scale-95"
                      onClick={() => toggleSet(ex.id, s.id)}
                      aria-label={done ? "Mark incomplete" : "Mark complete"}
                    >
                      {done ? (
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                );
              })}

              {/* Notes */}
              {notesOpen[ex.id] ? (
                <div className="pt-1">
                  <textarea
                    rows={2}
                    placeholder="Add a note for this exercise…"
                    className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    value={notes[ex.id] ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [ex.id]: e.target.value }))}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setNotesOpen((prev) => ({ ...prev, [ex.id]: true }))}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Add note
                </button>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* ── Add Exercise ─────────────────────────────────────────────────── */}
      {showAddForm ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add Exercise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ExerciseCombobox
              library={exerciseLibrary}
              value={newName}
              onChange={setNewName}
            />
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground shrink-0">Sets</label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={10}
                value={newSets}
                onChange={(e) => setNewSets(e.target.value)}
                disabled={addPending}
                className="h-11 w-20 text-center text-base font-medium"
              />
              <div className="flex gap-2 flex-1 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)} disabled={addPending}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || addPending} className="gap-1.5">
                  {addPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <button
          onClick={openAddForm}
          disabled={savePending || cancelPending}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary active:scale-[0.98] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add Exercise
        </button>
      )}

      {/* ── Exercise guide modal ─────────────────────────────────────────── */}
      {guideExercise && (
        <ExerciseGuideModal
          name={guideExercise.name}
          gifUrl={guideExercise.gifUrl}
          open={true}
          onClose={() => setGuideExercise(null)}
        />
      )}

      {/* ── Swap exercise modal ───────────────────────────────────────────── */}
      {swapTarget && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={() => !swapPending && setSwapTarget(null)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-card border-t border-border shadow-2xl px-5 pb-8 pt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-primary" />
                  Swap Exercise
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Replacing: <span className="font-medium text-foreground">{swapTarget.name}</span>
                </p>
              </div>
              <button
                onClick={() => setSwapTarget(null)}
                disabled={swapPending}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* AI suggestions */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                AI suggestions
              </p>
              {swapSuggestionsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Finding alternatives…
                </div>
              ) : swapSuggestionsError ? (
                <p className="text-xs text-red-400">{swapSuggestionsError}</p>
              ) : swapSuggestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {swapSuggestions.filter((s) => !exercises.some((ex) => ex.name === s)).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSwapName(s)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                        swapName === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-foreground border-border hover:border-primary/60"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground -mt-2">Or search manually:</p>
            <ExerciseCombobox
              library={exerciseLibrary.filter((n) => !exercises.some((ex) => ex.name === n))}
              value={swapName}
              onChange={setSwapName}
            />
            <Button
              size="lg"
              className="w-full gap-2 font-bold"
              onClick={handleSwap}
              disabled={!swapName.trim() || swapPending}
            >
              {swapPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowLeftRight className="h-5 w-5" />
              )}
              {swapPending ? "Swapping…" : "Swap Exercise"}
            </Button>
          </div>
        </>
      )}

      {/* ── Action buttons ───────────────────────────────────────────────── */}
      <div className="flex gap-3 pb-8 pt-2">
        <Button
          variant="outline"
          size="lg"
          className="flex-1 gap-2"
          onClick={handleCancel}
          disabled={savePending || cancelPending}
        >
          {cancelPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          Cancel
        </Button>

        <Button
          size="lg"
          className="flex-[2] gap-2 font-bold"
          onClick={handleSave}
          disabled={savePending || cancelPending}
        >
          {savePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {progress === 100 ? "Finish Workout 🎉" : "Save & Finish"}
        </Button>
      </div>

      {/* ── Rest timer (floating pill) ────────────────────────────────────── */}
      {restSeconds !== null && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full border border-border bg-card px-5 py-3 shadow-2xl">
          <Timer className={cn("h-5 w-5", restSeconds > 0 ? "text-amber-400" : "text-green-400")} />
          <span className={cn("text-sm font-bold tabular-nums", restSeconds > 0 ? "text-amber-400" : "text-green-400")}>
            {restSeconds > 0 ? `Rest ${restSeconds}s` : "Go! 💪"}
          </span>
          {restSeconds > 0 && (
            <button
              onClick={() => setRestEndsAt(null)}
              className="ml-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip
            </button>
          )}
        </div>
      )}
    </div>
  );
}
