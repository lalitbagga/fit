"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActionSheetAction = {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** shows a spinner and blocks dismissal */
  pending?: boolean;
};

/**
 * iOS action sheet: a stack of choices plus a separate Cancel button, anchored
 * to the bottom. Used for menus and destructive confirmations.
 */
export function ActionSheet({
  open,
  onClose,
  title,
  message,
  actions,
  cancelLabel = "Cancel",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actions: ActionSheetAction[];
  cancelLabel?: string;
}) {
  const busy = actions.some((a) => a.pending);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title ?? "Actions"}>
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={() => !busy && onClose()} />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-lg flex-col gap-2 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] animate-sheet-up">
        <div className="overflow-hidden rounded-[14px] bg-[#2C2C2E]/95 backdrop-blur-xl">
          {(title || message) && (
            <div className="px-4 py-3.5 text-center">
              {title && <p className="text-footnote font-semibold text-muted-foreground">{title}</p>}
              {message && <p className="mt-0.5 text-footnote text-muted-foreground">{message}</p>}
            </div>
          )}
          {actions.map((a, i) => (
            <button
              key={a.label}
              type="button"
              disabled={a.disabled || busy}
              onClick={a.onSelect}
              className={cn(
                "flex h-[57px] w-full items-center justify-center gap-2 text-[20px] tracking-[0.38px] active:bg-white/10 disabled:opacity-40",
                a.destructive ? "text-destructive" : "text-primary",
                (i > 0 || title || message) && "border-t-[0.5px] border-white/15"
              )}
            >
              {a.pending ? <Loader2 className="h-5 w-5 animate-spin" /> : a.icon}
              {a.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="h-[57px] w-full rounded-[14px] bg-[#2C2C2E] text-[20px] font-semibold tracking-[0.38px] text-primary active:bg-[#3A3A3C] disabled:opacity-40"
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}
