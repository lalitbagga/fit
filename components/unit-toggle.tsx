"use client";

import { useUnit } from "@/lib/unit-context";

export function UnitToggle() {
  const { unit, toggle } = useUnit();
  return (
    <button
      onClick={toggle}
      className="flex h-9 items-center justify-center rounded-full bg-muted px-3 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors tracking-wider uppercase"
      title={`Switch to ${unit === "kg" ? "lb" : "kg"}`}
    >
      {unit}
    </button>
  );
}
