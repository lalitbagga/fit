"use client";

export function WeightCell({ kg }: { kg: number | null }) {
  if (kg === null || kg === undefined) return <>—</>;
  return <>{kg} lb</>;
}

export function VolumeCell({ kgVol }: { kgVol: number }) {
  if (kgVol <= 0) return <>—</>;
  return <>{kgVol >= 1000 ? `${(kgVol / 1000).toFixed(1)}k` : kgVol}</>;
}

export function UnitLabel() {
  return <>lb</>;
}

export function WeightDelta({ firstKg, lastKg }: { firstKg: number; lastKg: number }) {
  const delta = Math.round((lastKg - firstKg) * 10) / 10;
  return <>{delta > 0 ? "+" : ""}{delta}</>;
}
