"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetButton } from "@/components/ui/sheet";
import { ActionSheet } from "@/components/ui/action-sheet";
import { startWorkout, deleteWorkoutTemplate } from "@/lib/actions";
import { cn } from "@/lib/utils";

type Template = {
  id: string;
  name: string;
  emoji: string;
  order: number;
  exercises: { name: string; sets: number; repsTarget: string }[];
};

// The first 4 templates are the seeded ones (order 0-3); user-created come after
const SEEDED_COUNT = 4;

export function TemplateSelector({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Template | null>(null);
  const [deletePending, startDelete] = useTransition();

  function close() {
    setOpen(false);
    setEditing(false);
  }

  function handleSelect(templateId: string) {
    setSelectedId(templateId);
    startTransition(async () => {
      await startWorkout(templateId);
    });
  }

  function handleDelete() {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    startDelete(async () => {
      await deleteWorkoutTemplate(id);
      setConfirmDelete(null);
    });
  }

  const seeded = templates.filter((t) => t.order < SEEDED_COUNT);
  const custom = templates.filter((t) => t.order >= SEEDED_COUNT);

  return (
    <>
      <Button size="lg" className="w-full" onClick={() => setOpen(true)}>
        <Play fill="currentColor" />
        Start Workout
      </Button>

      <Sheet
        open={open}
        onClose={close}
        title="Start Workout"
        dismissible={!pending}
        leading={<SheetButton onClick={close} disabled={pending}>Cancel</SheetButton>}
        trailing={
          custom.length > 0 ? (
            <SheetButton onClick={() => setEditing((e) => !e)} disabled={pending} bold={editing}>
              {editing ? "Done" : "Edit"}
            </SheetButton>
          ) : null
        }
      >
        <div className="flex flex-col gap-6 pt-2">
          <section>
            <p className="ios-section-header">My Workouts</p>
            <div className="ios-list">
              {custom.map((t) => (
                <TemplateRow
                  key={t.id}
                  template={t}
                  editing={editing}
                  loading={pending && selectedId === t.id}
                  disabled={pending}
                  onSelect={() => handleSelect(t.id)}
                  onDelete={() => setConfirmDelete(t)}
                />
              ))}
              <button
                type="button"
                className="ios-row"
                disabled={pending}
                onClick={() => {
                  close();
                  router.push("/templates/new");
                }}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center">
                  <Plus className="h-5 w-5 text-primary" />
                </span>
                <span className="ios-row-content">
                  <span className="text-body text-primary">New Workout</span>
                </span>
              </button>
            </div>
          </section>

          {seeded.length > 0 && (
            <section>
              <p className="ios-section-header">GoodLife Plans</p>
              <div className="ios-list">
                {seeded.map((t) => (
                  <TemplateRow
                    key={t.id}
                    template={t}
                    editing={false}
                    loading={pending && selectedId === t.id}
                    disabled={pending || editing}
                    onSelect={() => handleSelect(t.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </Sheet>

      <ActionSheet
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={`Delete “${confirmDelete?.name ?? ""}”?`}
        message="Past workouts keep their name and all logged sets."
        actions={[
          {
            label: deletePending ? "Deleting…" : "Delete Workout",
            destructive: true,
            pending: deletePending,
            onSelect: handleDelete,
          },
        ]}
      />
    </>
  );
}

// ── Row ──────────────────────────────────────────────────────────────────────

function TemplateRow({
  template: t,
  editing,
  loading,
  disabled,
  onSelect,
  onDelete,
}: {
  template: Template;
  editing: boolean;
  loading: boolean;
  disabled: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  const totalSets = t.exercises.reduce((s, e) => s + e.sets, 0);

  // A row is a <div> holding sibling buttons (never a button inside a button)
  return (
    <div className="ios-row">
      {editing && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${t.name}`}
          className="-ml-1 flex h-11 w-7 shrink-0 items-center justify-center"
        >
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-destructive">
            <span className="h-[2.5px] w-[11px] rounded-full bg-white" />
          </span>
        </button>
      )}
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled || editing}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 text-left",
          !editing && "active:opacity-60"
        )}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-secondary text-[24px]">
          {t.emoji}
        </span>
        <span className="ios-row-content">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body text-foreground">{t.name}</span>
            <span className="block truncate text-footnote text-muted-foreground">
              {t.exercises.length} exercises · {totalSets} sets ·{" "}
              {t.exercises.map((e) => e.name).join(", ")}
            </span>
          </span>
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : !editing ? (
            <ChevronRight className="h-4 w-4 shrink-0 text-tertiary" />
          ) : null}
        </span>
      </button>
    </div>
  );
}
