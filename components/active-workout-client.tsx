"use client";

import { ExerciseCombobox } from "@/components/exercise-combobox";
import { ExerciseGuideModal } from "@/components/exercise-guide-modal";
import { ActionSheet } from "@/components/ui/action-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addExerciseToWorkout,
  cancelWorkout,
  deleteExerciseFromWorkout,
  getSwapSuggestions,
  getWeightRecommendation,
  saveWorkout,
  swapExercise,
  type ExerciseInput,
} from "@/lib/actions";
import { cn } from "@/lib/utils";
import { haptic } from "ios-haptics";
import { ArrowLeftRight, Check, ChevronLeft, Info, Loader2, MessageSquare, MoreHorizontal, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

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
  workoutNotes: string | null;
  exercises: ExerciseData[];
  targets: TargetMap;
  exerciseLibrary: string[];
  gifUrls: Record<string, string | null>;
  title: string;
  emoji: string | null;
  /** ISO timestamp the workout was started */
  startedAt: string;
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

function openGoogleExerciseSearch(name: string): boolean {
  const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
    `${name} exercise proper form`
  )}`;
  const browserWindow = window.open(url, "_blank");
  if (!browserWindow) return false;
  browserWindow.opener = null;
  return true;
}

// ─── Component ───────────────────────────────────────────────────────────────

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export function ActiveWorkoutClient({ workoutId, workoutNotes, exercises: initialExercises, targets, exerciseLibrary, gifUrls, title, emoji, startedAt }: Props) {
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
  const [sessionNotes, setSessionNotes] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved).sessionNotes ?? workoutNotes ?? "";
    } catch {}
    return workoutNotes ?? "";
  });

  // Add-exercise form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSets, setNewSets] = useState("3");
  const [addPending, startAdd] = useTransition();

  const [savePending, startSave] = useTransition();
  const [cancelPending, startCancel] = useTransition();
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Exercise guide modal
  const [guideExercise, setGuideExercise] = useState<{ name: string; gifUrl: string | null } | null>(null);

  // Exercise swap modal — tracks which exercise is being swapped
  const [swapTarget, setSwapTarget] = useState<ExerciseData | null>(null);
  const [swapName, setSwapName] = useState("");
  const [swapPending, startSwap] = useTransition();
  const [swapSuggestions, setSwapSuggestions] = useState<string[]>([]);
  const [swapSuggestionsError, setSwapSuggestionsError] = useState<string | null>(null);
  const [swapSuggestionsLoading, setSwapSuggestionsLoading] = useState(false);
  const [swapViewport, setSwapViewport] = useState<{ height: number; bottom: number } | null>(null);
  const swapSearchRef = useRef<HTMLDivElement>(null);

  // "More" action sheet per exercise
  const [menuTarget, setMenuTarget] = useState<ExerciseData | null>(null);

  // Session notes collapse to a row until used
  const [sessionNotesOpen, setSessionNotesOpen] = useState(() => !!workoutNotes);

  // Elapsed time (client-only to avoid a server/client mismatch)
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = now === null ? null : (now - new Date(startedAt).getTime()) / 1000;

  // Show the title in the nav bar once the large title scrolls away
  const largeTitleRef = useRef<HTMLHeadingElement>(null);
  const [titleInBar, setTitleInBar] = useState(false);
  useEffect(() => {
    const el = largeTitleRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setTitleInBar(!entry.isIntersecting), {
      rootMargin: "-56px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Exercise deletion
  const [deleteTarget, setDeleteTarget] = useState<ExerciseData | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, startDelete] = useTransition();

  const unitLabel = "lb";

  // AI weight recommendations
  const [aiTips, setAiTips] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  // ── Rest timer — use end-timestamp so screen lock doesn't freeze it ────────
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(REST_SECONDS);

  function adjustRest(delta: number) {
    setRestEndsAt((end) => (end === null ? end : end + delta * 1000));
    setRestTotal((t) => Math.max(1, t + delta));
  }

  useEffect(() => {
    if (restEndsAt === null) { setRestSeconds(null); return; }

    function tick() {
      const remaining = Math.ceil((restEndsAt! - Date.now()) / 1000);
      if (remaining <= 0) {
        setRestSeconds(0);
        haptic.confirm();
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(660, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(1320, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.5, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
          osc.start();
          osc.stop(ctx.currentTime + 0.8);
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

  // Keep the swap sheet inside the visible area when a mobile keyboard opens.
  useEffect(() => {
    if (!swapTarget) {
      setSwapViewport(null);
      return;
    }

    const viewport = window.visualViewport;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function updateViewport() {
      if (!viewport) {
        setSwapViewport({ height: window.innerHeight, bottom: 0 });
        return;
      }
      setSwapViewport({
        height: Math.round(viewport.height),
        bottom: Math.max(
          0,
          Math.round(window.innerHeight - viewport.height - viewport.offsetTop)
        ),
      });
    }

    updateViewport();
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);

    return () => {
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      document.body.style.overflow = previousOverflow;
    };
  }, [swapTarget]);

  // ── Persist draft to localStorage so background/foreground doesn't lose data
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ localData, notes, sessionNotes })
      );
    } catch {}
  }, [localData, notes, sessionNotes, storageKey]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalSets = exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const completedCount = exercises.reduce(
    (n, ex) =>
      n + ex.sets.filter((s) => localData[ex.id]?.[s.id]?.completed).length,
    0
  );
  const progress = totalSets > 0 ? (completedCount / totalSets) * 100 : 0;
  const volume = exercises.reduce(
    (n, ex) =>
      n +
      ex.sets.reduce((m, s) => {
        const ls = localData[ex.id]?.[s.id];
        if (!ls?.completed) return m;
        return m + (parseFloat(ls.weight) || 0) * (parseInt(ls.reps, 10) || 0);
      }, 0),
    0
  );

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
    if (!wasCompleted) {
      haptic();
      setRestTotal(REST_SECONDS);
      setRestEndsAt(Date.now() + REST_SECONDS * 1000);
    }
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

  async function handleGetSwapSuggestions() {
    if (!swapTarget || swapSuggestionsLoading) return;
    setSwapSuggestionsLoading(true);
    setSwapSuggestionsError(null);

    try {
      const { suggestions, error } = await getSwapSuggestions(swapTarget.name);
      setSwapSuggestions(suggestions);
      setSwapSuggestionsError(error ?? null);
    } catch {
      setSwapSuggestionsError("Could not load AI suggestions. Please try again.");
    } finally {
      setSwapSuggestionsLoading(false);
    }
  }

  // ── Delete exercise ────────────────────────────────────────────────────────
  function handleDeleteExercise() {
    if (!deleteTarget) return;
    const exerciseId = deleteTarget.id;
    setDeleteError(null);

    startDelete(async () => {
      const result = await deleteExerciseFromWorkout(workoutId, exerciseId);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }

      setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
      setLocalData((prev) => {
        const { [exerciseId]: _removed, ...rest } = prev;
        return rest;
      });
      setNotes((prev) => {
        const { [exerciseId]: _removed, ...rest } = prev;
        return rest;
      });
      setNotesOpen((prev) => {
        const { [exerciseId]: _removed, ...rest } = prev;
        return rest;
      });
      setAiTips((prev) => {
        const { [exerciseId]: _removed, ...rest } = prev;
        return rest;
      });
      setDeleteTarget(null);
    });
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  function handleSave() {
    setSaveError(null);
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
      const result = await saveWorkout(workoutId, payload, sessionNotes);
      if (result?.error) {
        setSaveError(result.error);
        return;
      }
      // Only clear the draft after a confirmed save (redirect means we won't reach here on success)
      localStorage.removeItem(storageKey);
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
  const busy = savePending || cancelPending;

  return (
    <div className="flex flex-col pb-28">
      {/* ── Navigation bar (sticky, blurred) ─────────────────────────────── */}
      <div className="material-bar sticky top-0 z-30 -mx-4 -mt-[env(safe-area-inset-top)] pt-[env(safe-area-inset-top)] shadow-[0_0.5px_0_rgb(84_84_88/0.65)]">
        <div className="grid h-11 grid-cols-[1fr_auto_1fr] items-center px-2">
          <Link
            href="/"
            className="flex min-h-[44px] items-center justify-self-start pr-2 text-body text-primary active:opacity-50"
          >
            <ChevronLeft className="h-[26px] w-[26px] -ml-1" strokeWidth={2.4} />
            Home
          </Link>
          <p
            className={cn(
              "max-w-[46vw] truncate text-headline text-foreground transition-opacity duration-200",
              titleInBar ? "opacity-100" : "opacity-0"
            )}
            aria-hidden={!titleInBar}
          >
            {title}
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="flex min-h-[44px] items-center justify-self-end px-2 text-body font-semibold text-primary active:opacity-50 disabled:opacity-40"
          >
            {savePending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Finish"}
          </button>
        </div>
        <div className="h-[2px] w-full">
          <div
            className="h-full bg-success transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ── Large title + live metrics ───────────────────────────────────── */}
      <header className="pt-3">
        <h1 ref={largeTitleRef} className="text-large-title text-foreground">
          {emoji ? <span className="mr-2">{emoji}</span> : null}
          {title}
        </h1>
      </header>

      <div className="mt-4 grid grid-cols-3 rounded-xl bg-card py-3">
        <Metric label="Time" value={elapsed === null ? "–:––" : formatClock(elapsed)} tone="text-warning" />
        <Metric
          label="Sets"
          value={`${completedCount}/${totalSets}`}
          tone="text-success"
          divider
        />
        <Metric
          label="Volume"
          value={volume >= 10000 ? `${(volume / 1000).toFixed(1)}k` : Math.round(volume).toLocaleString()}
          unit={unitLabel}
          tone="text-primary"
          divider
        />
      </div>

      {/* ── Session notes (collapsed to a row until used) ────────────────── */}
      <div className="mt-3">
        {sessionNotesOpen ? (
          <div className="rounded-xl bg-card p-4">
            <label htmlFor="session-notes" className="text-footnote font-semibold uppercase text-muted-foreground">
              Warm-up &amp; Session Notes
            </label>
            <textarea
              id="session-notes"
              rows={3}
              value={sessionNotes}
              onChange={(event) => setSessionNotes(event.target.value)}
              placeholder="Warm-up plan, how you feel, reminders…"
              className="mt-2 w-full resize-none bg-transparent text-body text-foreground placeholder:text-tertiary focus:outline-none"
            />
          </div>
        ) : (
          <div className="ios-list">
            <button type="button" className="ios-row" onClick={() => setSessionNotesOpen(true)}>
              <MessageSquare className="h-5 w-5 shrink-0 text-primary" />
              <span className="ios-row-content">
                <span className="text-body text-primary">Add Warm-up or Session Note</span>
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ── Exercises ────────────────────────────────────────────────────── */}
      {exercises.map((ex) => {
        const target = targets[ex.name];
        const timed = isTimed(target?.repsTarget ?? "");
        const doneSets = ex.sets.filter((s) => localData[ex.id]?.[s.id]?.completed).length;
        const allDone = doneSets === ex.sets.length && ex.sets.length > 0;

        return (
          <section key={ex.id} className="pt-7">
            <div className="flex items-start gap-2 px-1 pb-2">
              <div className="min-w-0 flex-1">
                <h2 className="flex items-center gap-2 text-title3 font-semibold text-foreground">
                  <span className="min-w-0">{ex.name}</span>
                  {allDone && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success">
                      <Check className="h-3.5 w-3.5 text-black" strokeWidth={3.5} />
                    </span>
                  )}
                </h2>
                {target ? (
                  <p className="mt-0.5 text-subhead text-muted-foreground">
                    <span className="font-semibold text-foreground/90">
                      {ex.sets.length} × {target.repsTarget}
                    </span>
                    {target.notes ? ` · ${target.notes}` : ""}
                  </p>
                ) : (
                  <p className="mt-0.5 text-subhead text-muted-foreground">Added to this workout</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMenuTarget(ex)}
                aria-label={`More options for ${ex.name}`}
                className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center active:opacity-50"
              >
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-primary/15">
                  {aiLoading[ex.id] ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <MoreHorizontal className="h-5 w-5 text-primary" />
                  )}
                </span>
              </button>
            </div>

            {aiTips[ex.id] && (
              <div className="mb-2 flex items-start gap-2 rounded-xl bg-primary/15 px-3.5 py-2.5">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-subhead text-foreground">{aiTips[ex.id]}</p>
              </div>
            )}

            <div className="rounded-xl bg-card px-2 pb-2 pt-1.5">
              {/* Column headers */}
              <div className="grid grid-cols-[2.25rem_1fr_1fr_2.75rem] gap-2 px-1 pb-1 text-caption1 font-semibold uppercase text-muted-foreground">
                <span className="text-center">Set</span>
                {timed ? (
                  <span className="col-span-2 text-center">Seconds</span>
                ) : (
                  <>
                    <span className="text-center">{unitLabel}</span>
                    <span className="text-center">Reps</span>
                  </>
                )}
                <span className="sr-only">Done</span>
              </div>

              {ex.sets.map((s) => {
                const ls = localData[ex.id]?.[s.id];
                const done = ls?.completed ?? false;
                const field = cn(
                  "h-11 rounded-[8px] border-0 px-1 text-center font-rounded text-[19px] font-semibold tabular transition-colors focus-visible:ring-2",
                  done ? "bg-success/15 text-success" : "bg-secondary text-foreground"
                );

                return (
                  <div
                    key={s.id}
                    className="grid grid-cols-[2.25rem_1fr_1fr_2.75rem] items-center gap-2 px-1 py-1"
                  >
                    <span
                      className={cn(
                        "text-center font-rounded text-headline tabular",
                        done ? "text-success" : "text-muted-foreground"
                      )}
                    >
                      {s.setNumber}
                    </span>

                    {timed ? (
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="sec"
                        aria-label={`Set ${s.setNumber} seconds`}
                        className={cn("col-span-2", field)}
                        value={ls?.duration ?? ""}
                        onChange={(e) => updateSet(ex.id, s.id, "duration", e.target.value)}
                        onFocus={(e) => e.target.select()}
                      />
                    ) : (
                      <>
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder="–"
                          aria-label={`Set ${s.setNumber} weight`}
                          className={field}
                          value={ls?.weight ?? ""}
                          onChange={(e) => updateSet(ex.id, s.id, "weight", e.target.value)}
                          onFocus={(e) => e.target.select()}
                        />
                        <Input
                          type="number"
                          inputMode="numeric"
                          placeholder="–"
                          aria-label={`Set ${s.setNumber} reps`}
                          className={field}
                          value={ls?.reps ?? ""}
                          onChange={(e) => updateSet(ex.id, s.id, "reps", e.target.value)}
                          onFocus={(e) => e.target.select()}
                        />
                      </>
                    )}

                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center active:scale-90 transition-transform"
                      onClick={() => toggleSet(ex.id, s.id)}
                      aria-label={done ? `Mark set ${s.setNumber} incomplete` : `Mark set ${s.setNumber} complete`}
                      aria-pressed={done}
                    >
                      {done ? (
                        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-success">
                          <Check className="h-[18px] w-[18px] text-black" strokeWidth={3.5} />
                        </span>
                      ) : (
                        <span className="h-[30px] w-[30px] rounded-full border-2 border-[#48484A]" />
                      )}
                    </button>
                  </div>
                );
              })}

              {notesOpen[ex.id] && (
                <div className="px-1 pt-1">
                  <textarea
                    rows={2}
                    placeholder="Note for this exercise…"
                    aria-label={`Note for ${ex.name}`}
                    className="w-full resize-none rounded-[8px] bg-secondary px-3 py-2 text-subhead text-foreground placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-ring"
                    value={notes[ex.id] ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [ex.id]: e.target.value }))}
                  />
                </div>
              )}
            </div>
          </section>
        );
      })}

      {/* ── Add Exercise ─────────────────────────────────────────────────── */}
      <section className="pt-7">
        {showAddForm ? (
          <div className="flex flex-col gap-3 rounded-xl bg-card p-4">
            <p className="text-headline text-foreground">Add Exercise</p>
            <ExerciseCombobox library={exerciseLibrary} value={newName} onChange={setNewName} />
            <div className="flex items-center gap-3">
              <label htmlFor="new-sets" className="text-body text-muted-foreground">
                Sets
              </label>
              <Input
                id="new-sets"
                type="number"
                inputMode="numeric"
                min={1}
                max={10}
                value={newSets}
                onChange={(e) => setNewSets(e.target.value)}
                disabled={addPending}
                className="w-20 text-center font-rounded font-semibold tabular"
              />
              <div className="flex flex-1 justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowAddForm(false)} disabled={addPending}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={!newName.trim() || addPending}>
                  {addPending ? <Loader2 className="animate-spin" /> : <Plus />}
                  Add
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="ios-list">
            <button type="button" className="ios-row" onClick={openAddForm} disabled={busy}>
              <Plus className="h-5 w-5 shrink-0 text-primary" />
              <span className="ios-row-content">
                <span className="text-body text-primary">Add Exercise</span>
              </span>
            </button>
          </div>
        )}
      </section>

      {/* ── Finish / discard ─────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3 pt-8">
        {saveError && (
          <p className="rounded-xl bg-destructive/15 px-4 py-3 text-subhead text-destructive">{saveError}</p>
        )}
        <Button size="lg" className="w-full" onClick={handleSave} disabled={busy}>
          {savePending ? <Loader2 className="animate-spin" /> : <Check strokeWidth={3} />}
          {progress === 100 ? "Finish Workout 🎉" : "Finish Workout"}
        </Button>
        <Button
          variant="plain"
          size="lg"
          className="w-full text-destructive"
          onClick={() => setCancelConfirmOpen(true)}
          disabled={busy}
        >
          {cancelPending ? <Loader2 className="animate-spin" /> : null}
          Discard Workout
        </Button>
      </section>

      {/* ── Exercise "more" menu ─────────────────────────────────────────── */}
      <ActionSheet
        open={menuTarget !== null}
        onClose={() => setMenuTarget(null)}
        title={menuTarget?.name}
        actions={
          menuTarget
            ? [
                {
                  label: "Swap Exercise",
                  icon: <ArrowLeftRight className="h-5 w-5" />,
                  onSelect: () => {
                    const ex = menuTarget;
                    setMenuTarget(null);
                    setSwapTarget(ex);
                    setSwapName("");
                    setSwapSuggestions([]);
                    setSwapSuggestionsError(null);
                    setSwapSuggestionsLoading(false);
                  },
                },
                {
                  label: aiTips[menuTarget.id] ? "Weight Tip Shown" : "Suggest a Weight",
                  icon: <Sparkles className="h-5 w-5" />,
                  disabled: !!aiTips[menuTarget.id],
                  onSelect: () => {
                    const ex = menuTarget;
                    setMenuTarget(null);
                    fetchAiTip(ex.id, ex.name, targets[ex.name]?.repsTarget ?? "");
                  },
                },
                {
                  label: "How to Do It",
                  icon: <Info className="h-5 w-5" />,
                  onSelect: () => {
                    const ex = menuTarget;
                    setMenuTarget(null);
                    const gifUrl = gifUrls[ex.name] ?? null;
                    if (!gifUrl && openGoogleExerciseSearch(ex.name)) return;
                    setGuideExercise({ name: ex.name, gifUrl });
                  },
                },
                ...(!notesOpen[menuTarget.id]
                  ? [
                      {
                        label: "Add Note",
                        icon: <MessageSquare className="h-5 w-5" />,
                        onSelect: () => {
                          const id = menuTarget.id;
                          setMenuTarget(null);
                          setNotesOpen((prev) => ({ ...prev, [id]: true }));
                        },
                      },
                    ]
                  : []),
                {
                  label: "Remove Exercise",
                  icon: <Trash2 className="h-5 w-5" />,
                  destructive: true,
                  onSelect: () => {
                    const ex = menuTarget;
                    setMenuTarget(null);
                    setDeleteError(null);
                    setDeleteTarget(ex);
                  },
                },
              ]
            : []
        }
      />

      {/* ── Exercise guide modal ─────────────────────────────────────────── */}
      {guideExercise && (
        <ExerciseGuideModal
          name={guideExercise.name}
          gifUrl={guideExercise.gifUrl}
          open={true}
          onClose={() => setGuideExercise(null)}
          onImageUnavailable={() => openGoogleExerciseSearch(guideExercise.name)}
        />
      )}

      {/* ── Remove exercise confirmation ─────────────────────────────────── */}
      <ActionSheet
        open={deleteTarget !== null}
        onClose={() => !deletePending && setDeleteTarget(null)}
        title={`Remove ${deleteTarget?.name ?? ""}?`}
        message={deleteError ?? "Its sets will be removed from this workout."}
        actions={[
          {
            label: deletePending ? "Removing…" : "Remove Exercise",
            destructive: true,
            pending: deletePending,
            onSelect: handleDeleteExercise,
          },
        ]}
      />

      {/* ── Discard workout confirmation ─────────────────────────────────── */}
      <ActionSheet
        open={cancelConfirmOpen}
        onClose={() => !cancelPending && setCancelConfirmOpen(false)}
        title="Discard this workout?"
        message="All entered sets, exercise notes and session notes will be permanently deleted."
        actions={[
          {
            label: cancelPending ? "Discarding…" : "Discard Workout",
            destructive: true,
            pending: cancelPending,
            onSelect: handleCancel,
          },
        ]}
      />

      {/* ── Swap exercise sheet (stays above the keyboard) ───────────────── */}
      {swapTarget && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 animate-fade-in"
            onClick={() => !swapPending && setSwapTarget(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Swap Exercise"
            className="fixed inset-x-0 z-50 mx-auto flex max-w-lg flex-col gap-5 overflow-y-auto overscroll-contain rounded-t-[14px] bg-[#1C1C1E] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-sheet-up"
            style={{
              bottom: swapViewport?.bottom ?? 0,
              maxHeight: swapViewport ? `${swapViewport.height}px` : "90dvh",
            }}
          >
            <div className="sticky top-0 z-10 -mx-4 bg-[#1C1C1E] px-4">
              <div className="flex justify-center pt-[5px]">
                <div className="h-[5px] w-9 rounded-full bg-[#7F7F7F]/40" />
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center py-2">
                <button
                  type="button"
                  onClick={() => setSwapTarget(null)}
                  disabled={swapPending}
                  className="-mx-2 min-h-[44px] justify-self-start px-2 text-body text-primary active:opacity-50"
                >
                  Cancel
                </button>
                <h2 className="text-headline text-foreground">Swap Exercise</h2>
                <span />
              </div>
            </div>

            <p className="-mt-3 px-1 text-subhead text-muted-foreground">
              Replacing <span className="font-semibold text-foreground">{swapTarget.name}</span>
            </p>

            <div
              ref={swapSearchRef}
              onFocusCapture={() => {
                window.setTimeout(() => {
                  swapSearchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 250);
              }}
            >
              <ExerciseCombobox
                library={exerciseLibrary.filter((n) => !exercises.some((ex) => ex.name === n))}
                value={swapName}
                onChange={setSwapName}
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="ios-section-header px-1 pb-0">AI Suggestions</p>
                <Button
                  type="button"
                  variant="tinted"
                  size="sm"
                  onClick={handleGetSwapSuggestions}
                  disabled={swapSuggestionsLoading}
                >
                  {swapSuggestionsLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  {swapSuggestions.length > 0 ? "Refresh" : "Suggest"}
                </Button>
              </div>
              {swapSuggestionsLoading ? (
                <p className="flex items-center gap-2 px-1 text-footnote text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Finding alternatives…
                </p>
              ) : swapSuggestionsError ? (
                <p className="px-1 text-footnote text-destructive">{swapSuggestionsError}</p>
              ) : swapSuggestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {swapSuggestions
                    .filter((s) => !exercises.some((ex) => ex.name === s))
                    .map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSwapName(s)}
                        className={cn(
                          "min-h-[36px] rounded-full px-3.5 text-subhead transition-colors",
                          swapName === s ? "bg-primary font-semibold text-primary-foreground" : "bg-secondary text-foreground active:bg-accent"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                </div>
              ) : (
                <p className="px-1 text-footnote text-muted-foreground">AI only runs when you tap Suggest.</p>
              )}
            </div>

            <Button size="lg" className="w-full" onClick={handleSwap} disabled={!swapName.trim() || swapPending}>
              {swapPending ? <Loader2 className="animate-spin" /> : <ArrowLeftRight />}
              {swapPending ? "Swapping…" : "Swap Exercise"}
            </Button>
          </div>
        </>
      )}

      {/* ── Rest timer (floating capsule) ────────────────────────────────── */}
      {restSeconds !== null && (
        <div
          role="timer"
          aria-live="polite"
          className="material-bar fixed left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-[28rem] -translate-x-1/2 items-center gap-3 rounded-[22px] py-2.5 pl-3 pr-2.5 shadow-[0_8px_32px_rgb(0_0_0/0.5)] animate-sheet-up"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
        >
          <RestRing fraction={restSeconds > 0 ? restSeconds / restTotal : 0} done={restSeconds === 0} />
          <div className="min-w-0 flex-1">
            <p className={cn("text-caption1 font-semibold uppercase", restSeconds > 0 ? "text-warning" : "text-success")}>
              {restSeconds > 0 ? "Rest" : "Rest Over"}
            </p>
            <p className="font-rounded text-title2 font-semibold tabular text-foreground">
              {restSeconds > 0 ? formatClock(restSeconds) : "Go! 💪"}
            </p>
          </div>
          {restSeconds > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => adjustRest(-15)}
                aria-label="15 seconds less rest"
                className="h-9 min-w-[44px] rounded-full bg-white/10 px-2.5 font-rounded text-subhead font-semibold tabular text-foreground active:bg-white/20"
              >
                −15
              </button>
              <button
                type="button"
                onClick={() => adjustRest(15)}
                aria-label="15 seconds more rest"
                className="h-9 min-w-[44px] rounded-full bg-white/10 px-2.5 font-rounded text-subhead font-semibold tabular text-foreground active:bg-white/20"
              >
                +15
              </button>
              <button
                type="button"
                onClick={() => setRestEndsAt(null)}
                className="h-9 rounded-full bg-primary px-3.5 text-subhead font-semibold text-primary-foreground active:opacity-70"
              >
                Skip
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Small pieces ────────────────────────────────────────────────────────────

function Metric({
  label,
  value,
  unit,
  tone,
  divider,
}: {
  label: string;
  value: string;
  unit?: string;
  tone: string;
  divider?: boolean;
}) {
  return (
    <div className={cn("px-3", divider && "border-l-[0.5px] border-border")}>
      <p className={cn("text-caption1 font-semibold uppercase", tone)}>{label}</p>
      <p className="mt-0.5 font-rounded text-title2 font-semibold tabular text-foreground">
        {value}
        {unit ? <span className="ml-0.5 text-subhead font-semibold text-muted-foreground">{unit}</span> : null}
      </p>
    </div>
  );
}

function RestRing({ fraction, done }: { fraction: number; done: boolean }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="shrink-0 -rotate-90" aria-hidden>
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="4" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={done ? "hsl(var(--success))" : "hsl(var(--warning))"}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - (done ? 1 : fraction))}
        style={{ transition: "stroke-dashoffset 0.5s linear" }}
      />
    </svg>
  );
}
