"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * iOS-style bottom sheet: dimmed backdrop, grabber, a navigation-bar header
 * (leading action · centred title · trailing action) and a scrolling body
 * that respects the home-indicator inset.
 */
export function Sheet({
  open,
  onClose,
  title,
  leading,
  trailing,
  children,
  className,
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** false while an action is pending — backdrop / Escape won't close it */
  dismissible?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && dismissible) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="absolute inset-0 bg-black/60 animate-fade-in"
        onClick={() => dismissible && onClose()}
      />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] max-w-lg flex-col",
          "rounded-t-[14px] bg-[#1C1C1E] animate-sheet-up",
          className
        )}
      >
        {/* Grabber */}
        <div className="flex justify-center pt-[5px]">
          <div className="h-[5px] w-9 rounded-full bg-[#7F7F7F]/40" />
        </div>

        {/* Nav bar */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 pb-2 pt-2">
          <div className="justify-self-start">{leading}</div>
          <h2 className="truncate text-headline text-foreground">{title}</h2>
          <div className="justify-self-end">{trailing}</div>
        </div>

        <div
          data-sheet-scroll
          className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(env(safe-area-inset-bottom),1.25rem)]"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Text button for sheet nav bars ("Cancel", "Edit", "Done") */
export function SheetButton({
  children,
  onClick,
  disabled,
  bold,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  bold?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "-mx-2 min-h-[44px] px-2 text-body text-primary active:opacity-50 disabled:opacity-40",
        bold && "font-semibold"
      )}
    >
      {children}
    </button>
  );
}
