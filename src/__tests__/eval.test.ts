// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import os from "os";
import path from "path";
import { promises as fs } from "fs";
import { cer, wer, editDistance, fieldMatches, percentile } from "@/lib/eval/metrics";
import { runEvaluation, runChecksForSample, type LiveDeps } from "@/lib/eval/runner";
import { compareRuns } from "@/lib/eval/compare";
import { loadDataset, validateSample } from "@/lib/eval/dataset";
import type { EvalRun } from "@/lib/eval/types";

describe("metrics", () => {
  it("computes edit distance, CER and WER exactly", () => {
    expect(editDistance([..."kitten"], [..."sitting"])).toBe(3);
    expect(cer("abcd", "abcd")).toBe(0);
    expect(cer("abcd", "abxd")).toBe(0.25);
    expect(cer("", "")).toBe(0);
    expect(wer("pay the bill today", "pay bill today")).toBe(0.25);
    expect(wer("बिल भरा", "बिल भरा")).toBe(0);
    // Markdown syntax and Devanagari digits are normalised before scoring.
    expect(cer("Total ₹ 640", "**Total** ₹ ६४०")).toBe(0);
  });
  it("matches fields exactly after normalisation, never fuzzily", () => {
    expect(fieldMatches("Rs. 1,840.00", "₹1840", "amount")).toBe(true);
    expect(fieldMatches("Rs. 1,840.00", "₹1,841", "amount")).toBe(false);
    expect(fieldMatches("21 June 2026", "21/06/2026", "date")).toBe(true);
    expect(fieldMatches("21 June 2026", "12/06/2026", "date")).toBe(false);
    expect(fieldMatches("1234 5678 9012", "123456789012", "id")).toBe(true);
    expect(fieldMatches("Ramesh Kumar Patil", "ramesh kumar", "name")).toBe(false);
    expect(fieldMatches("x", null, "text")).toBe(false);
  });
  it("percentiles", () => {
    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
    expect(percentile([], 50)).toBeNull();
  });
});

describe("seed dataset", () => {
  it("loads, validates and is entirely synthetic", async () => {
    const samples = await loadDataset("seed");
    expect(samples.length).toBe(5);
    expect(samples.every((s) => s.synthetic)).toBe(true);
    expect(new Set(samples.map((s) => s.sourceLanguage))).toEqual(new Set(["en-IN", "hi-IN", "mr-IN"]));
  });
  it("rejects malformed samples and path traversal", () => {
    expect(() => validateSample({ id: "x" }, "x.json")).toThrow(/invalid/);
    const s = { id: "a", synthetic: true, category: "c", sourceLanguage: "en-IN", image: "../../etc/passwd", referenceOcr: "", expected: { amounts: [], dates: [], fields: [] }, qa: [] };
    expect(() => validateSample(s, "a.json")).toThrow(/image/);
  });
  it("checks mode passes on every seed sample (verification layer works on ground truth)", async () => {
    for (const s of await loadDataset("seed")) {
      const r = runChecksForSample(s);
      expect(r.failures, `${s.id}: ${JSON.stringify(r.failures)}`).toEqual([]);
      expect(r.metrics.checkerRecall).toBe(1);
      expect(r.metrics.checkerFalseAlarm).toBe(0);
    }
  });
});

const SUMMARY_OK = (amount: string, deadline: string) => ({
  document_type: "Bill", title: "t", key_facts: ["Ramesh Kumar Patil", "1234 5678 9012"], amounts: [{ label: "Total", value: amount }],
  dates: [{ label: "Bill date", value: "05-06-2026" }, { label: "Due", value: deadline }], deadline, action_required: "", warnings: [], summary_spoken: "",
});

describe("live runner with deterministic fakes", () => {
  it("scores OCR, detection, extraction and QA, and reports failures by stage", async () => {
    const [elec] = (await loadDataset("seed")).filter((s) => s.id === "elec-001");
    const deps: LiveDeps = {
      readImage: async () => new Uint8Array([1]),
      ocr: async () => elec.referenceOcr.replace("Ramesh", "Rarnesh"),
      detectLanguage: async () => "en-IN",
      summarize: async () => ({ summary: SUMMARY_OK("Rs. 1,840.00", "21 June 2026"), usage: { promptTokens: 1000, completionTokens: 500, model: "sarvam-105b" } }),
      answer: async (_t, _s, _l, q) =>
        q.startsWith("How much")
          ? { answer: "Rs. 9,999", quotes: [], usage: { promptTokens: 100, completionTokens: 10, model: "sarvam-30b" } }
          : { answer: "21 June 2026 is the last date. 2% late payment surcharge applies.", quotes: ["21 June 2026", "A late payment surcharge of 2% will be applied"], usage: { promptTokens: 100, completionTokens: 10, model: "sarvam-30b" } },
    };
    const run = await runEvaluation({
      id: "test-live-0001", mode: "live", datasetId: "seed", samples: [elec], deps,
      pricing: { currency: "INR", models: { "sarvam-105b": { input: 1, output: 2 }, "sarvam-30b": { input: 0.5, output: 1 } }, ocrPerPage: 0.5 },
    });
    const s = run.samples[0];
    expect(s.metrics.ocrCer).toBeGreaterThan(0);
    expect(s.metrics.ocrCer).toBeLessThan(0.01);
    expect(s.metrics.languageCorrect).toBe(1);
    expect(s.metrics.extractionAccuracy).toBe(1);
    expect(s.metrics.answerAccuracy).toBeCloseTo(2 / 3);
    expect(s.failures.some((f) => f.stage === "qa" && f.category === "unsupported_claim")).toBe(true);
    expect(run.metrics?.estimatedCost).toEqual({ amount: 0.5 + 1 + 1 + 3 * (0.05 + 0.01), currency: "INR" });
  });

  it("reports cost as unavailable when pricing or usage is missing, and records provider errors", async () => {
    const [hi] = (await loadDataset("seed")).filter((s) => s.id === "hi-text-001");
    const deps: LiveDeps = {
      readImage: async () => new Uint8Array(),
      ocr: async () => "",
      detectLanguage: async () => { throw new Error("Sarvam API /text-lid timed out after 15000ms"); },
      summarize: async () => ({ summary: SUMMARY_OK("₹ 640", "25 सितंबर 2026"), usage: null }),
      answer: async () => { throw new Error("upstream 503 key sk-abcdef1234567"); },
    };
    const run = await runEvaluation({ id: "test-live-0002", mode: "live", datasetId: "seed", samples: [hi], deps, pricing: null });
    expect(run.metrics?.estimatedCost).toBeNull();
    const cats = run.samples[0].failures.map((f) => `${f.stage}:${f.category}`);
    expect(cats).toContain("detection:timeout");
    expect(cats).toContain("qa:provider_error");
    expect(JSON.stringify(run)).not.toContain("sk-abcdef1234567");
  });

  it("refuses live mode without provider access", async () => {
    const run = await runEvaluation({ id: "test-live-0003", mode: "live", datasetId: "seed", samples: [] });
    expect(run.status).toBe("failed");
  });
});

function fakeRun(id: string, metrics: Partial<NonNullable<EvalRun["metrics"]>>, failed: string[] = [], mode: EvalRun["mode"] = "live"): EvalRun {
  const base = { locatorRecall: null, normalizationAccuracy: null, ocrCer: null, ocrWer: null, languageAccuracy: null, extractionAccuracy: null, numericAccuracy: null, evidenceCoverage: null, answerAccuracy: null, faithfulness: null, checkerRecall: null, checkerFalseAlarm: null, sampleSuccessRate: 1, latencyP50Ms: null, latencyP95Ms: null, estimatedCost: null };
  return {
    id, mode, status: "completed", datasetId: "seed", datasetSize: 2, syntheticOnly: true, createdAt: "2026-01-01", finishedAt: "2026-01-01",
    progress: { done: 2, total: 2 }, metrics: { ...base, ...metrics }, byCategory: {}, byLanguage: {}, failureCounts: {}, pipeline: {}, error: null,
    samples: ["a", "b"].map((s) => ({ sampleId: s, category: "c", language: "en-IN", synthetic: true, ok: !failed.includes(s), latencyMs: {}, metrics: {}, failures: [] })),
  };
}

describe("run comparison rules", () => {
  it("improvement only when nothing regressed", () => {
    expect(compareRuns(fakeRun("r1", { answerAccuracy: 0.5 }), fakeRun("r2", { answerAccuracy: 0.8 })).verdict).toBe("improved");
    expect(compareRuns(fakeRun("r1", { answerAccuracy: 0.5, ocrCer: 0.05 }), fakeRun("r2", { answerAccuracy: 0.8, ocrCer: 0.2 })).verdict).toBe("mixed");
    expect(compareRuns(fakeRun("r1", { answerAccuracy: 0.5 }), fakeRun("r2", { answerAccuracy: 0.505 })).verdict).toBe("unchanged");
  });
  it("newly failing samples are a regression", () => {
    const c = compareRuns(fakeRun("r1", {}), fakeRun("r2", {}, ["b"]));
    expect(c.newlyFailing).toEqual(["b"]);
    expect(c.verdict).toBe("regressed");
  });
  it("refuses to compare different modes", () => {
    const c = compareRuns(fakeRun("r1", {}, [], "checks"), fakeRun("r2", {}));
    expect(c).toMatchObject({ comparable: false, verdict: "not_comparable" });
  });
});

describe("evaluation API: admin-only, real job lifecycle", () => {
  let dir: string;
  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-eval-"));
    vi.stubEnv("EVAL_RESULTS_DIR", dir);
  });
  afterAll(async () => {
    vi.unstubAllEnvs();
    await fs.rm(dir, { recursive: true, force: true });
  });

  const req = (url: string, init: RequestInit = {}, token?: string) =>
    new Request(`http://x${url}`, { ...init, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) } });

  it("is disabled when no admin token is configured, and rejects missing/wrong tokens", async () => {
    const { GET } = await import("@/app/api/eval/runs/route");
    vi.stubEnv("EVAL_ADMIN_TOKEN", "");
    expect((await GET(req("/api/eval/runs", {}, "anything"))).status).toBe(503);
    vi.stubEnv("EVAL_ADMIN_TOKEN", "a-very-long-admin-token-for-tests-123");
    expect((await GET(req("/api/eval/runs"))).status).toBe(401);
    expect((await GET(req("/api/eval/runs", {}, "a-very-long-admin-token-for-tests-12"))).status).toBe(403);
    expect((await GET(req("/api/eval/runs", {}, "a-very-long-admin-token-for-tests-123"))).status).toBe(200);
  });

  it("starts a checks run, prevents duplicates, persists results, serves them and compares", async () => {
    vi.stubEnv("EVAL_ADMIN_TOKEN", "a-very-long-admin-token-for-tests-123");
    vi.stubEnv("SARVAM_API_KEY", "");
    const T = "a-very-long-admin-token-for-tests-123";
    const runs = await import("@/app/api/eval/runs/route");
    const one = await import("@/app/api/eval/runs/[id]/route");
    const cmp = await import("@/app/api/eval/compare/route");

    const live = await runs.POST(req("/api/eval/runs", { method: "POST", body: JSON.stringify({ mode: "live" }) }, T));
    expect(live.status).toBe(503); // no provider key: refuse, don't fake

    const started = await runs.POST(req("/api/eval/runs", { method: "POST", body: JSON.stringify({ mode: "checks" }) }, T));
    expect(started.status).toBe(202);
    const { run } = await started.json();

    // Wait for completion via the real status endpoint.
    let final: EvalRun | null = null;
    for (let i = 0; i < 50 && !final; i++) {
      const r = await (await one.GET(req(`/api/eval/runs/${run.id}`, {}, T), { params: Promise.resolve({ id: run.id }) })).json();
      if (r.run.status === "completed") final = r.run;
      else await new Promise((res) => setTimeout(res, 20));
    }
    expect(final?.metrics?.checkerRecall).toBe(1);
    expect(final?.syntheticOnly).toBe(true);
    await new Promise((res) => setTimeout(res, 50));
    expect((await fs.readdir(dir)).some((f) => f === `${run.id}.json`)).toBe(true);

    const second = await (await runs.POST(req("/api/eval/runs", { method: "POST", body: JSON.stringify({ mode: "checks" }) }, T))).json();
    let second2: EvalRun | null = null;
    for (let i = 0; i < 50 && !second2; i++) {
      const r = await (await one.GET(req(`/api/eval/runs/${second.run.id}`, {}, T), { params: Promise.resolve({ id: second.run.id }) })).json();
      if (r.run.status === "completed") second2 = r.run;
      else await new Promise((res) => setTimeout(res, 20));
    }
    const c = await (await cmp.GET(req(`/api/eval/compare?base=${run.id}&candidate=${second.run.id}`, {}, T))).json();
    expect(c.comparison.verdict).toBe("unchanged");

    const missing = await one.GET(req("/api/eval/runs/../../etc", {}, T), { params: Promise.resolve({ id: "../../etc" }) });
    expect(missing.status).toBe(404);
  });

  it("refuses a second run while one is running", async () => {
    vi.stubEnv("EVAL_ADMIN_TOKEN", "a-very-long-admin-token-for-tests-123");
    const store = await import("@/lib/eval/store");
    const slow: LiveDeps = {
      readImage: () => new Promise(() => undefined), ocr: async () => "", detectLanguage: async () => null,
      summarize: async () => { throw new Error("x"); }, answer: async () => { throw new Error("x"); },
    };
    await store.startRun({ mode: "live", datasetId: "seed", deps: slow });
    await expect(store.startRun({ mode: "checks", datasetId: "seed" })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
