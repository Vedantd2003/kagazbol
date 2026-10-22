/**
 * KagazBol evaluation CLI.
 *
 *   npm run eval                       # checks mode on eval/datasets/seed (free, deterministic; used in CI)
 *   npm run eval -- --live             # real Sarvam pipeline (needs SARVAM_API_KEY; costs money)
 *   npm run eval -- --dataset=mydata   # another dataset under eval/datasets/
 *   npm run eval -- --live --commit    # also save to eval/results-committed/ so the dashboard shows it after deploy
 *
 * Exit code is 1 if any sample fails in checks mode (CI gate). Live runs never fail CI.
 */
import * as dotenv from "dotenv";
import path from "path";
import { loadDataset } from "../src/lib/eval/dataset";
import { runEvaluation } from "../src/lib/eval/runner";
import { saveRun } from "../src/lib/eval/store";
import { createLiveDeps, loadPricing, LIVE_PIPELINE } from "../src/lib/eval/live";
import type { EvalRun, RunMetrics } from "../src/lib/eval/types";

dotenv.config();

const args = new Map(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? "true"] as const;
}));

const pct = (v: number | null) => (v == null ? "not measured" : `${(v * 100).toFixed(1)}%`);
const num = (v: number | null, d = 3) => (v == null ? "not measured" : v.toFixed(d));

function printMetrics(m: RunMetrics) {
  const rows: [string, string][] = [
    ["OCR CER (lower is better)", num(m.ocrCer)],
    ["OCR WER (lower is better)", num(m.ocrWer)],
    ["Language detection accuracy", pct(m.languageAccuracy)],
    ["Field extraction accuracy", pct(m.extractionAccuracy)],
    ["Amount extraction accuracy", pct(m.numericAccuracy)],
    ["Evidence coverage", pct(m.evidenceCoverage)],
    ["Answer accuracy", pct(m.answerAccuracy)],
    ["Answers with supporting evidence", pct(m.faithfulness)],
    ["Evidence locator recall", pct(m.locatorRecall)],
    ["Value normalisation accuracy", pct(m.normalizationAccuracy)],
    ["Checker catch rate (planted errors)", pct(m.checkerRecall)],
    ["Checker false alarms", pct(m.checkerFalseAlarm)],
    ["Samples with no failures", pct(m.sampleSuccessRate)],
    ["Latency p50 / p95 (ms)", `${m.latencyP50Ms ?? "–"} / ${m.latencyP95Ms ?? "–"}`],
    ["Estimated cost", m.estimatedCost ? `${m.estimatedCost.amount} ${m.estimatedCost.currency}` : "Unavailable"],
  ];
  for (const [k, v] of rows) console.log(`  ${k.padEnd(38)} ${v}`);
}

async function main() {
  const live = args.has("live");
  const dataset = args.get("dataset") ?? "seed";
  if (live && !process.env.SARVAM_API_KEY) {
    console.error("--live needs SARVAM_API_KEY. Nothing was run.");
    process.exit(2);
  }
  const samples = await loadDataset(dataset);
  const id = `${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-").toLowerCase()}-cli${live ? "-live" : "-checks"}`;
  console.log(`Running ${live ? "LIVE" : "checks"} evaluation on "${dataset}" (${samples.length} samples${samples.every((s) => s.synthetic) ? ", all synthetic" : ""})…`);

  const run: EvalRun = await runEvaluation({
    id,
    mode: live ? "live" : "checks",
    datasetId: dataset,
    samples,
    deps: live ? createLiveDeps() : undefined,
    pricing: live ? loadPricing() : null,
    pipeline: live ? LIVE_PIPELINE : { checker: "evidence + faithfulness heuristics (no model calls)" },
    onProgress: (r) => process.stdout.write(`\r  ${r.progress.done}/${r.progress.total}`),
  });
  console.log("\n");
  if (run.metrics) printMetrics(run.metrics);

  const failures = run.samples.flatMap((s) => s.failures.map((f) => ({ sample: s.sampleId, ...f })));
  if (failures.length) {
    console.log(`\n${failures.length} failure(s):`);
    for (const f of failures.slice(0, 40)) console.log(`  [${f.sample}] ${f.stage}/${f.category}: expected ${f.expected} · got ${f.actual} — ${f.detail}`);
  }

  await saveRun(run, path.join(process.cwd(), "eval", "results"));
  if (args.has("commit")) await saveRun(run, path.join(process.cwd(), "eval", "results-committed"));
  console.log(`\nSaved run ${run.id}.`);
  if (!live && failures.length) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
