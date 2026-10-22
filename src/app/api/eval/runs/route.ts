import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { AppError } from "@/lib/errors";
import { errorResponse, readJson } from "@/lib/http";
import { listRuns, startRun, isRunning } from "@/lib/eval/store";
import { listDatasets, loadDataset } from "@/lib/eval/dataset";
import { createLiveDeps, loadPricing, LIVE_PIPELINE } from "@/lib/eval/live";
import type { EvalRun } from "@/lib/eval/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Run list without per-sample detail (fetch /api/eval/runs/:id for that). */
function summary(r: EvalRun) {
  const { samples, ...rest } = r;
  return { ...rest, failedSamples: samples.filter((s) => !s.ok).length };
}

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    const datasets = await listDatasets();
    const sizes = Object.fromEntries(await Promise.all(datasets.map(async (d) => [d, (await loadDataset(d).catch(() => [])).length] as const)));
    return NextResponse.json({
      runs: (await listRuns()).map(summary),
      datasets: sizes,
      running: isRunning(),
      liveAvailable: !!process.env.SARVAM_API_KEY,
      pricingConfigured: !!loadPricing(),
    });
  } catch (err) {
    return errorResponse(err, "eval/runs");
  }
}

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const body = await readJson(request, 4096);
    const mode = body.mode === "live" ? "live" : body.mode === "checks" ? "checks" : null;
    if (!mode) throw new AppError("BAD_REQUEST", "mode must be 'checks' or 'live'.");
    const datasetId = typeof body.dataset === "string" ? body.dataset : "seed";
    if (mode === "live" && !process.env.SARVAM_API_KEY) throw new AppError("NOT_CONFIGURED", "Live evaluation needs SARVAM_API_KEY on the server.");
    const run = await startRun({
      mode,
      datasetId,
      deps: mode === "live" ? createLiveDeps() : undefined,
      pricing: mode === "live" ? loadPricing() : null,
      pipeline: mode === "live" ? LIVE_PIPELINE : { checker: "evidence + faithfulness heuristics (no model calls)" },
    });
    return NextResponse.json({ run: summary(run) }, { status: 202 });
  } catch (err) {
    return errorResponse(err, "eval/runs");
  }
}
