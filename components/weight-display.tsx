"use client";

import { useUnit } from "@/lib/unit-context";

export function WeightCell({ kg }: { kg: number | null }) {
  const { toDisplay, label } = useUnit();
  if (kg === null || kg === undefined) return <>—</>;
  return <>{toDisplay(kg)} {label}</>;
}

export function VolumeCell({ kgVol }: { kgVol: number }) {
  const { toDisplay, label } = useUnit();
  if (kgVol <= 0) return <>—</>;
  const val = toDisplay(kgVol);
  return <>{val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}</>;
}

export function UnitLabel() {
  const { label } = useUnit();
  return <>{label}</>;
}

export function WeightDelta({ firstKg, lastKg }: { firstKg: number; lastKg: number }) {
  const { toDisplay } = useUnit();
  const delta = Math.round((toDisplay(lastKg) - toDisplay(firstKg)) * 10) / 10;
  return <>{delta > 0 ? "+" : ""}{delta}</>;
}
