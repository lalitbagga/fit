"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function ExportDataButton({ disabled = false }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (from && to && from > to) {
      setError("From date must be before or equal to To date.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const response = await fetch(`/api/export${params.size ? `?${params}` : ""}`);
      if (!response.ok) throw new Error((await response.text()) || "Export failed.");

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? "fit-ai-export.zip";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5"
        onClick={() => { setError(null); setOpen(true); }}
        disabled={disabled}
      >
        <Download className="h-4 w-4" />
        Export
      </Button>

      <Dialog open={open} onOpenChange={(next) => !loading && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export data for AI</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Choose an optional date range. Leave both blank to export all workout data.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="export-from" className="text-xs font-medium text-muted-foreground">From</label>
              <Input id="export-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="export-to" className="text-xs font-medium text-muted-foreground">To</label>
              <Input id="export-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} disabled={loading} />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Downloads a token-efficient ZIP containing sessions.csv, exercises.csv, sets.csv, and a short README.
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleExport} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {loading ? "Preparing…" : "Download ZIP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
