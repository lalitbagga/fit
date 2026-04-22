"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useUnit } from "@/lib/unit-context";
import type { ProgressPoint } from "@/lib/actions";

type Tab = "weight" | "volume";
type TooltipEntry = { value?: number; name?: string };

export function ExerciseChart({ data }: { data: ProgressPoint[] }) {
  const [tab, setTab] = useState<Tab>("weight");
  const { label, toDisplay } = useUnit();

  const displayData = data.map((d) => ({
    ...d,
    maxWeight: toDisplay(d.maxWeight),
    totalVolume: toDisplay(d.totalVolume),
  }));

  function Tooltip_({ active, payload, label: lbl }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
    if (!active || !payload?.length) return null;
    const value = payload[0].value ?? 0;
    const name = payload[0].name ?? "";
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-sm">
        <p className="font-semibold text-foreground">{lbl}</p>
        <p className="text-primary">
          {name === "maxWeight"
            ? `${value} ${label}`
            : `${value.toLocaleString()} ${label} vol`}
        </p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No data yet — complete a session to see your graph.
      </div>
    );
  }

  if (data.length === 1) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-sm text-muted-foreground">
        <p>First session logged!</p>
        <p className="text-xs">Come back after your next session to see progress.</p>
      </div>
    );
  }

  const maxW = Math.max(...displayData.map((d) => d.maxWeight));
  const firstWeight = displayData[0].maxWeight;
  const lastWeight = displayData[displayData.length - 1].maxWeight;
  const delta = Math.round((lastWeight - firstWeight) * 10) / 10;

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        {(["weight", "volume"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors capitalize",
              tab === t
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "weight" ? "Max Weight" : "Volume"}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          {tab === "weight" ? (
            <LineChart data={displayData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[Math.max(0, maxW * 0.7), maxW * 1.1]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}${label}`}
              />
              <Tooltip content={<Tooltip_ />} />
              {firstWeight > 0 && (
                <ReferenceLine
                  y={firstWeight}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                />
              )}
              <Line
                type="monotone"
                dataKey="maxWeight"
                name="maxWeight"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ fill: "hsl(var(--primary))", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          ) : (
            <BarChart data={displayData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`}
              />
              <Tooltip content={<Tooltip_ />} />
              <Bar
                dataKey="totalVolume"
                name="totalVolume"
                fill="hsl(var(--primary))"
                opacity={0.85}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Delta callout */}
      {tab === "weight" && firstWeight > 0 && (
        <div
          className={cn(
            "rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-between",
            delta > 0
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : delta < 0
              ? "bg-red-500/10 text-red-400 border border-red-500/20"
              : "bg-muted text-muted-foreground"
          )}
        >
          <span>Since first session</span>
          <span className="font-bold tabular-nums">
            {delta > 0 ? "+" : ""}{delta} {label}
          </span>
        </div>
      )}
    </div>
  );
}
