import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { AppError } from "../errors";
import { runEvaluation, type LiveDeps, type Pricing } from "./runner";
import { loadDataset } from "./dataset";
import type { EvalMode, EvalRun } from "./types";

/**
 * Evaluation run store: JSON files on disk + in-memory state for the running job.
 *
 * Render's filesystem is ephemeral, so in production results survive restarts only
 * if EVAL_RESULTS_DIR points at a persistent disk. Results committed by the CLI
 * (eval/results-committed/) are also read so the dashboard always has history.
 */
const RUN_ID = /^[a-z0-9-]{8,64}$/;

export function resultsDir(): string {
  return process.env.EVAL_RESULTS_DIR || path.join(process.cwd(), ".data", "eval-runs");
}
const COMMITTED_DIR = path.join(process.cwd(), "eval", "results-committed");

const active = new Map<string, EvalRun>();

async function readDir(dir: string): Promise<EvalRun[]> {
  try {
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
    const runs = await Promise.all(
      files.map(async (f) => {
        try {
          return JSON.parse(await fs.readFile(path.join(dir, f), "utf-8")) as EvalRun;
        } catch {
          return null;
        }
      })
    );
    return runs.filter((r): r is EvalRun => !!r && RUN_ID.test(r.id));
  } catch {
    return [];
  }
}

export async function saveRun(run: EvalRun, dir = resultsDir()): Promise<void> {
  if (!RUN_ID.test(run.id)) throw new Error("bad run id");
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(dir, `${run.id}.json.tmp`);
  await fs.writeFile(tmp, JSON.stringify(run, null, 2));
  await fs.rename(tmp, path.join(dir, `${run.id}.json`));
}

export async function listRuns(): Promise<EvalRun[]> {
  const byId = new Map<string, EvalRun>();
  for (const r of [...(await readDir(COMMITTED_DIR)), ...(await readDir(resultsDir()))]) byId.set(r.id, r);
  for (const r of active.values()) byId.set(r.id, r);
  // A run persisted as "running" that is not active in this process was cut short by a restart.
  return [...byId.values()]
    .map((r) => (r.status === "running" && !active.has(r.id) ? { ...r, status: "interrupted" as const } : r))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getRun(id: string): Promise<EvalRun | null> {
  if (!RUN_ID.test(id)) return null;
  return (await listRuns()).find((r) => r.id === id) ?? null;
}

export function isRunning(): boolean {
  return [...active.values()].some((r) => r.status === "running");
}

/**
 * Starts a run in the background and returns immediately. Only one run at a time:
 * evaluation can be expensive in live mode, so concurrent starts are refused.
 */
export async function startRun(opts: { mode: EvalMode; datasetId: string; deps?: LiveDeps; pricing?: Pricing | null; pipeline?: Record<string, string> }): Promise<EvalRun> {
  if (isRunning()) throw new AppError("CONFLICT", "An evaluation is already running.");
  const samples = await loadDataset(opts.datasetId).catch(() => {
    throw new AppError("BAD_REQUEST", "Unknown or invalid dataset.");
  });
  const id = `${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-").toLowerCase()}-${randomUUID().slice(0, 8)}`;
  let latest: EvalRun | null = null;
  const done = runEvaluation({
    id,
    mode: opts.mode,
    datasetId: opts.datasetId,
    samples,
    deps: opts.deps,
    pricing: opts.pricing,
    pipeline: opts.pipeline,
    onProgress: (r) => {
      latest = r;
      active.set(id, r);
    },
  });
  const initial = active.get(id)!;
  void done
    .then(async (run) => {
      active.set(id, run);
      await saveRun(run).catch((e) => console.error("[eval] could not save run", e instanceof Error ? e.message : e));
    })
    .catch(async (err) => {
      const failed: EvalRun = { ...(latest ?? initial), status: "failed", finishedAt: new Date().toISOString(), error: err instanceof Error ? err.message.slice(0, 200) : "Evaluation failed" };
      active.set(id, failed);
      await saveRun(failed).catch(() => undefined);
    })
    .finally(() => {
      // Keep the finished run in memory briefly so pollers see the final state even if the disk write failed.
      setTimeout(() => active.delete(id), 10 * 60_000).unref?.();
    });
  return initial;
}
