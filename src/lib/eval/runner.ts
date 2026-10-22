/**
 * Evaluation runner.
 *
 * Two modes, never mixed in one run:
 *
 * - "checks" (deterministic, free, used in CI): evaluates KagazBol's own
 *   verification layer — evidence location, value normalisation and the
 *   faithfulness checker — against the labelled dataset, including planted wrong
 *   values (negative controls). It makes NO model calls and says nothing about
 *   model accuracy.
 *
 * - "live" (needs SARVAM_API_KEY, costs money): runs the real provider pipeline
 *   per sample — OCR (image samples), language detection, structured extraction,
 *   grounded QA — and scores it against ground truth.
 */
import { locateAmount, locateDate, locateQuote, checkAnswer } from "../evidence";
import { buildFieldChecks } from "../pipeline";
import { normalizeAmount, normalizeDate, normalizeText, extractAmounts, extractDates } from "../normalize";
import { normalizeLanguageCode, isAppLanguage, type AppLanguage } from "../languages";
import type { DocumentSummary } from "../types";
import { cer, wer, fieldMatches, mean, percentile, rate } from "./metrics";
import type { EvalMode, EvalRun, EvalSample, RunMetrics, SampleFailure, SampleResult } from "./types";

export interface Usage {
  promptTokens: number;
  completionTokens: number;
  model: string;
}

/** Provider functions for live mode. Injected so tests can use deterministic fakes. */
export interface LiveDeps {
  readImage(path: string): Promise<Uint8Array>;
  ocr(bytes: Uint8Array, language: string): Promise<string>;
  detectLanguage(text: string): Promise<string | null>;
  summarize(text: string, language: AppLanguage): Promise<{ summary: DocumentSummary; usage: Usage | null }>;
  answer(text: string, summary: DocumentSummary, language: AppLanguage, question: string): Promise<{ answer: string; quotes: string[]; usage: Usage | null }>;
}

export interface Pricing {
  currency: string;
  /** Per 1k tokens, keyed by model id. */
  models: Record<string, { input: number; output: number }>;
  /** Per OCR'd page. */
  ocrPerPage?: number;
}

/** Thresholds that turn a metric into a per-sample failure. Documented in docs/EVAL.md. */
export const FAILURE_THRESHOLDS = { cer: 0.1, wer: 0.2 };

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

function shortText(s: string, max = 140): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function errorCategory(err: unknown): "timeout" | "provider_error" {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /timeout|timed out|PROVIDER_TIMEOUT|408/i.test(msg) ? "timeout" : "provider_error";
}

function errMsg(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  // Strip anything that looks like a key or a URL query string.
  return shortText(m.replace(/(sk|key)[-_][A-Za-z0-9]{6,}/gi, "[redacted]").replace(/\?[^\s]+/g, "?…"));
}

/** Perturbs an amount so it no longer matches anything in the document. */
function perturbAmount(value: string, doc: string): string {
  const n = normalizeAmount(value) ?? 0;
  const docAmounts = extractAmounts(doc);
  let candidate = n + 137;
  while (docAmounts.some((d) => Math.abs(d - candidate) < 0.005)) candidate += 137;
  return `Rs. ${candidate.toLocaleString("en-IN")}`;
}

function perturbDate(value: string, doc: string): string {
  const iso = normalizeDate(value) ?? "2026-01-01";
  const docDates = new Set(extractDates(doc));
  const d = new Date(`${iso}T00:00:00Z`);
  do d.setUTCDate(d.getUTCDate() + 3);
  while (docDates.has(d.toISOString().slice(0, 10)));
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

/** Deterministic evaluation of the verification layer for one sample. */
export function runChecksForSample(sample: EvalSample): SampleResult {
  const doc = sample.referenceOcr;
  const failures: SampleFailure[] = [];
  const t0 = now();

  // 1. Evidence location: every labelled evidence quote and value must be found.
  const evidenceFound: boolean[] = [];
  for (const qa of sample.qa) {
    for (const q of qa.evidence) {
      const ok = !!locateQuote(q, doc);
      evidenceFound.push(ok);
      if (!ok) failures.push({ stage: "evidence", category: "evidence_not_found", expected: q, actual: "not located", detail: "Quote is labelled as evidence but the locator could not find it." });
    }
  }
  for (const a of sample.expected.amounts) {
    const ok = !!locateAmount(a.value, doc);
    evidenceFound.push(ok);
    if (!ok) failures.push({ stage: "evidence", category: "evidence_not_found", expected: a.value, actual: "not located", detail: `Amount "${a.label}" not located numerically.` });
  }
  for (const d of sample.expected.dates) {
    const ok = !!locateDate(d.value, doc);
    evidenceFound.push(ok);
    if (!ok) failures.push({ stage: "evidence", category: "evidence_not_found", expected: d.value, actual: "not located", detail: `Date "${d.label}" not located.` });
  }

  // 2. Normalisation: values written in a different format must still match.
  const normOk: boolean[] = [];
  for (const a of sample.expected.amounts) {
    const n = normalizeAmount(a.value);
    if (n == null) continue;
    const ok = fieldMatches(a.value, `₹${n}`, "amount");
    normOk.push(ok);
    if (!ok) failures.push({ stage: "checker", category: "checker_miss", expected: a.value, actual: `₹${n}`, detail: "Equivalent amount formats did not match." });
  }
  for (const d of sample.expected.dates) {
    const iso = normalizeDate(d.value);
    if (!iso) {
      normOk.push(false);
      failures.push({ stage: "checker", category: "checker_miss", expected: d.value, actual: "unparsed", detail: "Date format not understood by normalizeDate()." });
      continue;
    }
    const [y, m, dd] = iso.split("-");
    normOk.push(fieldMatches(d.value, `${dd}/${m}/${y}`, "date"));
  }

  // 3. Faithfulness checker on correct answers (must not be flagged) and planted wrong ones (must be flagged).
  const caught: boolean[] = [];
  const falseAlarm: boolean[] = [];
  for (const qa of sample.qa) {
    const good = checkAnswer(qa.answer, qa.evidence, doc);
    const alarm = good.verification === "unverified";
    falseAlarm.push(alarm);
    if (alarm) failures.push({ stage: "checker", category: "checker_miss", expected: "supported", actual: good.verification, detail: `Correct answer to "${shortText(qa.question, 60)}" was flagged.` });

    if (qa.answerType === "amount" || qa.answerType === "date") {
      const wrong = qa.answerType === "amount" ? perturbAmount(qa.answer, doc) : perturbDate(qa.answer, doc);
      const bad = checkAnswer(wrong, [], doc);
      const ok = bad.verification === "unverified" && bad.unsupportedValues.length > 0;
      caught.push(ok);
      if (!ok) failures.push({ stage: "checker", category: "false_evidence", expected: "flagged", actual: bad.verification, detail: `Planted value ${wrong} was not flagged.` });
    }
  }

  // 4. A planted wrong amount must not be "found" in the document.
  for (const a of sample.expected.amounts) {
    const wrong = perturbAmount(a.value, doc);
    const found = !!locateAmount(wrong, doc);
    caught.push(!found);
    if (found) failures.push({ stage: "checker", category: "false_evidence", expected: "not found", actual: "found", detail: `Planted amount ${wrong} was located.` });
  }

  return {
    sampleId: sample.id,
    category: sample.category,
    language: sample.sourceLanguage,
    synthetic: sample.synthetic,
    ok: failures.length === 0,
    latencyMs: { total: Math.round(now() - t0) },
    metrics: {
      locatorRecall: rate(evidenceFound),
      normalizationAccuracy: rate(normOk),
      checkerRecall: rate(caught),
      checkerFalseAlarm: rate(falseAlarm),
    },
    failures,
  };
}

function containsAnswer(expected: string, answer: string, type: "amount" | "date" | "text"): boolean {
  if (type === "amount") {
    const e = normalizeAmount(expected) ?? extractAmounts(expected)[0];
    return e != null && extractAmounts(answer).some((n) => Math.abs(n - e) < 0.005);
  }
  if (type === "date") {
    const e = normalizeDate(expected);
    return !!e && extractDates(answer).includes(e);
  }
  // Text answers: ≥60% of the expected answer's tokens appear in the reply.
  // Documented as a lenient lexical check, not semantic equivalence.
  const exp = normalizeText(expected).split(" ").filter(Boolean);
  const got = new Set(normalizeText(answer).split(" "));
  return exp.length > 0 && exp.filter((t) => got.has(t)).length / exp.length >= 0.6;
}

function costOf(usage: Usage[], ocrPages: number, pricing: Pricing | null): number | null {
  if (!pricing) return null;
  let total = 0;
  for (const u of usage) {
    const p = pricing.models[u.model];
    if (!p) return null; // unknown model price → cost unavailable rather than wrong
    total += (u.promptTokens / 1000) * p.input + (u.completionTokens / 1000) * p.output;
  }
  if (ocrPages > 0) {
    if (pricing.ocrPerPage == null) return null;
    total += ocrPages * pricing.ocrPerPage;
  }
  return total;
}

/** Live evaluation of one sample against the real provider pipeline. */
export async function runLiveSample(sample: EvalSample, deps: LiveDeps, pricing: Pricing | null): Promise<SampleResult & { cost: number | null; usageComplete: boolean }> {
  const failures: SampleFailure[] = [];
  const latency: Record<string, number> = {};
  const metrics: Record<string, number | null> = {};
  const usage: Usage[] = [];
  let usageComplete = true;
  let ocrPages = 0;
  const lang: AppLanguage = isAppLanguage(normalizeLanguageCode(sample.sourceLanguage)) ? (normalizeLanguageCode(sample.sourceLanguage) as AppLanguage) : "en-IN";
  const t0 = now();

  // OCR
  let text = sample.referenceOcr;
  if (sample.image) {
    const t = now();
    try {
      const bytes = await deps.readImage(sample.image);
      text = await deps.ocr(bytes, lang);
      ocrPages = 1;
      metrics.ocrCer = cer(sample.referenceOcr, text);
      metrics.ocrWer = wer(sample.referenceOcr, text);
      if (metrics.ocrCer > FAILURE_THRESHOLDS.cer || metrics.ocrWer > FAILURE_THRESHOLDS.wer) {
        failures.push({ stage: "ocr", category: "high_error_rate", expected: `CER ≤ ${FAILURE_THRESHOLDS.cer}, WER ≤ ${FAILURE_THRESHOLDS.wer}`, actual: `CER ${metrics.ocrCer.toFixed(3)}, WER ${metrics.ocrWer.toFixed(3)}`, detail: `OCR output starts: "${shortText(text, 80)}"` });
      }
    } catch (err) {
      failures.push({ stage: "ocr", category: errorCategory(err), expected: "OCR text", actual: "error", detail: errMsg(err) });
      latency.ocr = Math.round(now() - t);
      return finish();
    }
    latency.ocr = Math.round(now() - t);
  }

  // Language detection
  {
    const t = now();
    try {
      const detected = normalizeLanguageCode(await deps.detectLanguage(text));
      const correct = detected === normalizeLanguageCode(sample.sourceLanguage);
      metrics.languageCorrect = correct ? 1 : 0;
      if (!correct) failures.push({ stage: "detection", category: "language_mismatch", expected: sample.sourceLanguage, actual: detected ?? "none", detail: "Text LID on the (OCR'd) document text." });
    } catch (err) {
      metrics.languageCorrect = null;
      failures.push({ stage: "detection", category: errorCategory(err), expected: sample.sourceLanguage, actual: "error", detail: errMsg(err) });
    }
    latency.detection = Math.round(now() - t);
  }

  // Structured extraction
  let summary: DocumentSummary | null = null;
  {
    const t = now();
    try {
      const r = await deps.summarize(text, lang);
      summary = r.summary;
      if (r.usage) usage.push(r.usage);
      else usageComplete = false;
    } catch (err) {
      failures.push({ stage: "extraction", category: errorCategory(err), expected: "summary", actual: "error", detail: errMsg(err) });
    }
    latency.extraction = Math.round(now() - t);
  }

  if (summary) {
    const fieldOk: boolean[] = [];
    const numericOk: boolean[] = [];
    for (const a of sample.expected.amounts) {
      const ok = summary.amounts.some((p) => fieldMatches(a.value, p.value, "amount"));
      fieldOk.push(ok);
      numericOk.push(ok);
      if (!ok) failures.push({ stage: "extraction", category: "missing_value", expected: `${a.label}: ${a.value}`, actual: summary.amounts.map((x) => x.value).join(", ") || "none", detail: "Expected amount not among extracted amounts." });
    }
    for (const d of sample.expected.dates) {
      const ok = summary.dates.some((p) => fieldMatches(d.value, p.value, "date")) || fieldMatches(d.value, summary.deadline, "date");
      fieldOk.push(ok);
      if (!ok) failures.push({ stage: "extraction", category: "missing_value", expected: `${d.label}: ${d.value}`, actual: summary.dates.map((x) => x.value).join(", ") || "none", detail: "Expected date not among extracted dates." });
    }
    if (sample.expected.deadline) {
      const ok = fieldMatches(sample.expected.deadline, summary.deadline, "date");
      fieldOk.push(ok);
      if (!ok) failures.push({ stage: "extraction", category: "wrong_value", expected: sample.expected.deadline, actual: summary.deadline ?? "null", detail: "Deadline mismatch." });
    }
    const allText = normalizeText(JSON.stringify(summary));
    for (const f of sample.expected.fields) {
      const ok = allText.includes(normalizeText(f.value));
      fieldOk.push(ok);
      if (!ok) failures.push({ stage: "extraction", category: "missing_value", expected: `${f.name}: ${f.value}`, actual: "not mentioned", detail: "Field value not present anywhere in the summary." });
    }
    metrics.extractionAccuracy = rate(fieldOk);
    metrics.numericAccuracy = rate(numericOk);

    // Precision side: every value the model extracted must exist in the document.
    const checks = buildFieldChecks(summary, text);
    metrics.extractedValuesSupported = rate(checks.map((c) => c.found));
    for (const c of checks.filter((x) => !x.found)) {
      failures.push({ stage: "extraction", category: "unsupported_claim", expected: "value present in document", actual: c.value, detail: `Extracted ${c.field} not found in the document text.` });
    }
  }

  // Grounded QA
  if (summary) {
    const correct: boolean[] = [];
    const faithful: boolean[] = [];
    const withEvidence: boolean[] = [];
    const t = now();
    for (const qa of sample.qa) {
      try {
        const r = await deps.answer(text, summary, lang, qa.question);
        if (r.usage) usage.push(r.usage);
        else usageComplete = false;
        const check = checkAnswer(r.answer, r.quotes, text);
        const ok = containsAnswer(qa.answer, r.answer, qa.answerType);
        correct.push(ok);
        faithful.push(check.verification !== "unverified");
        withEvidence.push(check.evidence.length > 0);
        if (!ok) failures.push({ stage: "qa", category: "wrong_value", expected: qa.answer, actual: shortText(r.answer), detail: `Q: ${shortText(qa.question, 80)}` });
        if (check.unsupportedValues.length) failures.push({ stage: "qa", category: "unsupported_claim", expected: "values from document", actual: check.unsupportedValues.join(", "), detail: `Q: ${shortText(qa.question, 80)}` });
      } catch (err) {
        correct.push(false);
        faithful.push(false);
        withEvidence.push(false);
        failures.push({ stage: "qa", category: errorCategory(err), expected: qa.answer, actual: "error", detail: errMsg(err) });
      }
    }
    latency.qa = Math.round(now() - t);
    metrics.answerAccuracy = rate(correct);
    metrics.faithfulness = rate(faithful);
    metrics.evidenceCoverage = rate(withEvidence);
  }

  return finish();

  function finish() {
    latency.total = Math.round(now() - t0);
    const cost = usageComplete ? costOf(usage, ocrPages, pricing) : null;
    return {
      sampleId: sample.id,
      category: sample.category,
      language: sample.sourceLanguage,
      synthetic: sample.synthetic,
      ok: failures.length === 0,
      latencyMs: latency,
      metrics,
      failures,
      cost,
      usageComplete,
    };
  }
}

function avgMetric(samples: SampleResult[], key: string): number | null {
  return mean(samples.map((s) => s.metrics[key]).filter((v): v is number => typeof v === "number"));
}

export function aggregate(samples: SampleResult[], cost: RunMetrics["estimatedCost"]): RunMetrics {
  const totals = samples.map((s) => s.latencyMs.total).filter((n): n is number => typeof n === "number");
  return {
    ocrCer: avgMetric(samples, "ocrCer"),
    ocrWer: avgMetric(samples, "ocrWer"),
    languageAccuracy: avgMetric(samples, "languageCorrect"),
    extractionAccuracy: avgMetric(samples, "extractionAccuracy"),
    numericAccuracy: avgMetric(samples, "numericAccuracy"),
    evidenceCoverage: avgMetric(samples, "evidenceCoverage"),
    answerAccuracy: avgMetric(samples, "answerAccuracy"),
    faithfulness: avgMetric(samples, "faithfulness"),
    locatorRecall: avgMetric(samples, "locatorRecall"),
    normalizationAccuracy: avgMetric(samples, "normalizationAccuracy"),
    checkerRecall: avgMetric(samples, "checkerRecall"),
    checkerFalseAlarm: avgMetric(samples, "checkerFalseAlarm"),
    sampleSuccessRate: samples.length ? samples.filter((s) => s.ok).length / samples.length : 0,
    latencyP50Ms: percentile(totals, 50),
    latencyP95Ms: percentile(totals, 95),
    estimatedCost: cost,
  };
}

function groupBy(samples: SampleResult[], key: (s: SampleResult) => string) {
  const groups: Record<string, SampleResult[]> = {};
  for (const s of samples) (groups[key(s)] ??= []).push(s);
  return Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, { ...aggregate(v, null), samples: v.length }]));
}

export interface RunOptions {
  id: string;
  mode: EvalMode;
  datasetId: string;
  samples: EvalSample[];
  deps?: LiveDeps;
  pricing?: Pricing | null;
  pipeline?: Record<string, string>;
  onProgress?: (run: EvalRun) => void;
}

/** Runs an evaluation end-to-end and returns the completed run record. */
export async function runEvaluation(opts: RunOptions): Promise<EvalRun> {
  const run: EvalRun = {
    id: opts.id,
    mode: opts.mode,
    status: "running",
    datasetId: opts.datasetId,
    datasetSize: opts.samples.length,
    syntheticOnly: opts.samples.every((s) => s.synthetic),
    createdAt: new Date().toISOString(),
    finishedAt: null,
    progress: { done: 0, total: opts.samples.length },
    metrics: null,
    byCategory: {},
    byLanguage: {},
    failureCounts: {},
    samples: [],
    pipeline: opts.pipeline ?? {},
    error: null,
  };
  opts.onProgress?.(run);

  if (opts.mode === "live" && !opts.deps) {
    return { ...run, status: "failed", finishedAt: new Date().toISOString(), error: "Live mode needs provider access (SARVAM_API_KEY)." };
  }

  let costSum = 0;
  let costKnown = opts.mode === "live" && !!opts.pricing;
  for (const sample of opts.samples) {
    if (opts.mode === "checks") {
      run.samples.push(runChecksForSample(sample));
    } else {
      const r = await runLiveSample(sample, opts.deps!, opts.pricing ?? null);
      if (r.cost == null) costKnown = false;
      else costSum += r.cost;
      const { cost: _cost, usageComplete: _u, ...rest } = r;
      void _cost;
      void _u;
      run.samples.push(rest);
    }
    run.progress = { done: run.samples.length, total: opts.samples.length };
    opts.onProgress?.({ ...run });
  }

  run.metrics = aggregate(run.samples, costKnown ? { amount: Math.round(costSum * 10000) / 10000, currency: opts.pricing!.currency } : null);
  run.byCategory = groupBy(run.samples, (s) => s.category);
  run.byLanguage = groupBy(run.samples, (s) => s.language);
  for (const s of run.samples) for (const f of s.failures) run.failureCounts[`${f.stage}:${f.category}`] = (run.failureCounts[`${f.stage}:${f.category}`] ?? 0) + 1;
  run.status = "completed";
  run.finishedAt = new Date().toISOString();
  return run;
}
