import { Registry, collectDefaultMetrics, Counter, Histogram } from "prom-client";

// Single registry shared across all requests in the same Node.js process.
// Next.js hot-reload creates a new module in dev, so we pin it to globalThis
// to avoid "metric already registered" errors.
const globalForMetrics = globalThis as unknown as { metricsRegistry?: Registry };

function createRegistry(): Registry {
  const registry = new Registry();
  registry.setDefaultLabels({ app: "fit2x" });

  // Node.js process metrics: event loop lag, heap, GC, CPU, etc.
  collectDefaultMetrics({ register: registry });

  return registry;
}

export const registry = globalForMetrics.metricsRegistry ?? createRegistry();
if (process.env.NODE_ENV !== "production") globalForMetrics.metricsRegistry = registry;

// ── Custom counters ────────────────────────────────────────────────────────────

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [registry],
});

export const workoutsStarted = new Counter({
  name: "workouts_started_total",
  help: "Total number of workouts started",
  registers: [registry],
});

export const workoutsCompleted = new Counter({
  name: "workouts_completed_total",
  help: "Total number of workouts completed",
  registers: [registry],
});

export const setsLogged = new Counter({
  name: "sets_logged_total",
  help: "Total number of sets logged",
  registers: [registry],
});
