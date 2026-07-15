import { NextRequest, NextResponse } from "next/server";
import { registry } from "@/lib/metrics";

// Scrape endpoint for Prometheus / Grafana Agent.
// Protected by a static bearer token so it's not publicly readable.
export async function GET(req: NextRequest) {
  const token = process.env.METRICS_TOKEN;

  if (token) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${token}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const metrics = await registry.metrics();

  return new NextResponse(metrics, {
    headers: { "Content-Type": registry.contentType },
  });
}
