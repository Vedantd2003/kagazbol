import type { EvalRun, RunMetrics } from "./types";

/**
 * Explicit comparison rules (also in docs/EVAL.md):
 * - Each metric has a direction and a minimum meaningful change. Smaller changes are "unchanged".
 * - Runs are only comparable when they used the same mode and dataset.
 * - Verdict is "improved" only if at least one metric improved and none regressed;
 *   any regression together with an improvement is "mixed" — one better number
 *   never makes a pipeline "better" on its own.
 * - Newly failing samples always count as a regression.
 */
export const METRIC_RULES: Record<Exclude<keyof RunMetrics, "estimatedCost">, { better: "higher" | "lower"; minDelta: number; label: string }> = {
  ocrCer: { better: "lower", minDelta: 0.01, label: "OCR character error rate" },
  ocrWer: { better: "lower", minDelta: 0.02, label: "OCR word error rate" },
  languageAccuracy: { better: "higher", minDelta: 0.05, label: "Language detection accuracy" },
  extractionAccuracy: { better: "higher", minDelta: 0.02, label: "Field extraction accuracy" },
  numericAccuracy: { better: "higher", minDelta: 0.02, label: "Amount extraction accuracy" },
  evidenceCoverage: { better: "higher", minDelta: 0.02, label: "Evidence coverage" },
  answerAccuracy: { better: "higher", minDelta: 0.02, label: "Answer accuracy" },
  faithfulness: { better: "higher", minDelta: 0.02, label: "Answers with supporting evidence" },
  locatorRecall: { better: "higher", minDelta: 0.01, label: "Evidence locator recall" },
  normalizationAccuracy: { better: "higher", minDelta: 0.01, label: "Value normalisation accuracy" },
  checkerRecall: { better: "higher", minDelta: 0.01, label: "Checker catch rate" },
  checkerFalseAlarm: { better: "lower", minDelta: 0.01, label: "Checker false alarms" },
  sampleSuccessRate: { better: "higher", minDelta: 0.01, label: "Samples with no failures" },
  latencyP50Ms: { better: "lower", minDelta: 250, label: "Median latency (ms)" },
  latencyP95Ms: { better: "lower", minDelta: 500, label: "p95 latency (ms)" },
};

export type Change = "improved" | "regressed" | "unchanged" | "not_comparable";

export interface MetricDiff {
  metric: string;
  label: string;
  before: number | null;
  after: number | null;
  delta: number | null;
  change: Change;
}

export interface RunComparison {
  baseId: string;
  candidateId: string;
  comparable: boolean;
  reason: string | null;
  verdict: "improved" | "regressed" | "mixed" | "unchanged" | "not_comparable";
  metrics: MetricDiff[];
  newlyFailing: string[];
  newlyPassing: string[];
  cost: { before: number | null; after: number | null; currency: string | null };
}

export function compareRuns(base: EvalRun, candidate: EvalRun): RunComparison {
  const comparable = base.mode === candidate.mode && base.datasetId === candidate.datasetId && !!base.metrics && !!candidate.metrics;
  const reason = !comparable
    ? base.mode !== candidate.mode
      ? "Runs used different modes."
      : base.datasetId !== candidate.datasetId
        ? "Runs used different datasets."
        : "One of the runs has no results."
    : null;

  const metrics: MetricDiff[] = Object.entries(METRIC_RULES).map(([key, rule]) => {
    const before = base.metrics?.[key as keyof typeof METRIC_RULES] ?? null;
    const after = candidate.metrics?.[key as keyof typeof METRIC_RULES] ?? null;
    if (!comparable || before == null || after == null) return { metric: key, label: rule.label, before, after, delta: null, change: "not_comparable" };
    const delta = after - before;
    let change: Change = "unchanged";
    if (Math.abs(delta) >= rule.minDelta) change = (rule.better === "higher" ? delta > 0 : delta < 0) ? "improved" : "regressed";
    return { metric: key, label: rule.label, before, after, delta, change };
  });

  const failed = (r: EvalRun) => new Set(r.samples.filter((s) => !s.ok).map((s) => s.sampleId));
  const bFail = failed(base);
  const cFail = failed(candidate);
  const newlyFailing = comparable ? [...cFail].filter((id) => !bFail.has(id)) : [];
  const newlyPassing = comparable ? [...bFail].filter((id) => !cFail.has(id) && candidate.samples.some((s) => s.sampleId === id)) : [];

  let verdict: RunComparison["verdict"] = "not_comparable";
  if (comparable) {
    const up = metrics.some((m) => m.change === "improved") || newlyPassing.length > 0;
    const down = metrics.some((m) => m.change === "regressed") || newlyFailing.length > 0;
    verdict = up && down ? "mixed" : up ? "improved" : down ? "regressed" : "unchanged";
  }

  return {
    baseId: base.id,
    candidateId: candidate.id,
    comparable,
    reason,
    verdict,
    metrics,
    newlyFailing,
    newlyPassing,
    cost: {
      before: base.metrics?.estimatedCost?.amount ?? null,
      after: candidate.metrics?.estimatedCost?.amount ?? null,
      currency: candidate.metrics?.estimatedCost?.currency ?? base.metrics?.estimatedCost?.currency ?? null,
    },
  };
}
