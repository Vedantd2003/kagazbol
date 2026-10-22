"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { FlaskConical, Lock, Play, RefreshCw } from "lucide-react";
import { Wordmark } from "@/components/ui/Wordmark";
import { Button } from "@/components/ui/Button";
import { Stamp } from "@/components/ui/Stamp";
import type { EvalRun, RunMetrics } from "@/lib/eval/types";
import type { RunComparison } from "@/lib/eval/compare";
import { BarList, TrendLine } from "./charts";

type RunSummary = Omit<EvalRun, "samples"> & { failedSamples: number };
interface ListResponse {
  runs: RunSummary[];
  datasets: Record<string, number>;
  running: boolean;
  liveAvailable: boolean;
  pricingConfigured: boolean;
}

const pct = (v: number | null | undefined) => (v == null ? "Not measured" : `${(v * 100).toFixed(1)}%`);
const dec = (v: number | null | undefined) => (v == null ? "Not measured" : v.toFixed(3));
const ms = (v: number | null | undefined) => (v == null ? "Not measured" : v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`);

/** Which metrics each mode actually measures — others are never shown as numbers for it. */
const TILES: Record<EvalRun["mode"], { key: keyof RunMetrics; label: string; fmt: (v: number | null) => string; hint: string }[]> = {
  live: [
    { key: "ocrCer", label: "OCR character error rate", fmt: dec, hint: "Lower is better. Image samples only." },
    { key: "ocrWer", label: "OCR word error rate", fmt: dec, hint: "Lower is better." },
    { key: "extractionAccuracy", label: "Field extraction accuracy", fmt: pct, hint: "Expected amounts, dates, deadline, ids found in the explanation." },
    { key: "numericAccuracy", label: "Amount extraction accuracy", fmt: pct, hint: "Numeric match; currency and grouping normalised." },
    { key: "answerAccuracy", label: "Answer accuracy", fmt: pct, hint: "Amount/date answers exact; text answers ≥60% token overlap." },
    { key: "faithfulness", label: "Answers with supporting evidence", fmt: pct, hint: "Checker result verified or partial — a heuristic, not proof." },
    { key: "evidenceCoverage", label: "Evidence coverage", fmt: pct, hint: "Answers with at least one quote located in the document." },
    { key: "languageAccuracy", label: "Language detection accuracy", fmt: pct, hint: "Text LID vs labelled language." },
    { key: "latencyP50Ms", label: "Median latency per sample", fmt: ms, hint: "End-to-end, all stages." },
  ],
  checks: [
    { key: "locatorRecall", label: "Evidence locator recall", fmt: pct, hint: "Labelled quotes and values found in the reference text." },
    { key: "normalizationAccuracy", label: "Value normalisation", fmt: pct, hint: "Same amount/date in another format recognised as equal." },
    { key: "checkerRecall", label: "Checker catch rate", fmt: pct, hint: "Planted wrong amounts/dates that were flagged." },
    { key: "checkerFalseAlarm", label: "Checker false alarms", fmt: pct, hint: "Correct answers wrongly flagged. Lower is better." },
  ],
};

export function EvalDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [data, setData] = useState<ListResponse | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<EvalRun["mode"]>("checks");
  const [selected, setSelected] = useState<EvalRun | null>(null);
  const [compare, setCompare] = useState<{ base: string; candidate: string }>({ base: "", candidate: "" });
  const [comparison, setComparison] = useState<RunComparison | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const api = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const res = await fetch(path, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(body.message ?? "Request failed"), { status: res.status });
      return body as T;
    },
    [token]
  );

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const d = await api<ListResponse>("/api/eval/runs");
      setData(d);
      setGateError(null);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403 || status === 503) {
        setToken(null);
        setData(null);
        setGateError(status === 503 ? "The evaluation dashboard is not enabled on this server. Set EVAL_ADMIN_TOKEN (24+ characters) in the server environment." : "That admin token was not accepted.");
      } else setActionError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api, token]);

  useEffect(() => {
    // Deferred so the fetch's loading state isn't set synchronously inside the effect.
    void Promise.resolve().then(refresh);
  }, [refresh]);

  // Poll while a run is in progress.
  useEffect(() => {
    if (!data?.running) return;
    const id = setInterval(() => void refresh(), 1500);
    return () => clearInterval(id);
  }, [data?.running, refresh]);

  async function start(m: EvalRun["mode"]) {
    setActionError(null);
    try {
      await api("/api/eval/runs", { method: "POST", body: JSON.stringify({ mode: m, dataset: "seed" }) });
      setMode(m);
      await refresh();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  async function openRun(id: string) {
    try {
      const { run } = await api<{ run: EvalRun }>(`/api/eval/runs/${id}`);
      setSelected(run);
      requestAnimationFrame(() => document.getElementById("run-detail")?.scrollIntoView({ block: "start" }));
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  async function runCompare(e: FormEvent) {
    e.preventDefault();
    try {
      const { comparison } = await api<{ comparison: RunComparison }>(`/api/eval/compare?base=${encodeURIComponent(compare.base)}&candidate=${encodeURIComponent(compare.candidate)}`);
      setComparison(comparison);
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  const runs = data?.runs ?? [];
  const modeRuns = runs.filter((r) => r.mode === mode);
  const latest = modeRuns.find((r) => r.status === "completed");
  const completedChrono = modeRuns.filter((r) => r.status === "completed" && r.metrics).slice().reverse();
  const trendKey: keyof RunMetrics = mode === "live" ? "answerAccuracy" : "checkerRecall";
  const trendPoints = completedChrono.filter((r) => r.metrics?.[trendKey] != null).map((r) => ({ id: r.id, date: r.createdAt, value: r.metrics![trendKey] as number }));

  if (!token) {
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="mx-auto flex w-full max-w-6xl items-center px-5 py-5"><Wordmark /></header>
        <main className="mx-auto grid w-full max-w-md flex-1 content-center px-5 pb-24">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) setToken(draft.trim());
            }}
            className="sheet p-7"
          >
            <Lock className="size-7 text-stamp" aria-hidden />
            <h1 className="mt-4 font-display text-3xl">Reliability dashboard</h1>
            <p className="mt-2 text-base text-ink-2">For KagazBol developers. Enter the admin token set in the server&rsquo;s <code className="text-sm">EVAL_ADMIN_TOKEN</code>. It is kept only in this tab.</p>
            <label htmlFor="token" className="mt-6 block font-semibold">Admin token</label>
            <input id="token" type="password" autoComplete="off" value={draft} onChange={(e) => setDraft(e.target.value)} className="mt-2 min-h-12 w-full rounded-[var(--radius-control)] border border-rule-strong bg-sheet-2 px-3 text-base" />
            {gateError && <p role="alert" className="mt-3 text-base text-due">{gateError}</p>}
            <Button type="submit" variant="primary" size="lg" className="mt-5 w-full">Open dashboard</Button>
            <Link href="/" className="mt-4 inline-block text-sm text-ink-2 underline underline-offset-4">Back to KagazBol</Link>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-rule bg-sheet">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4">
          <Wordmark />
          <span className="text-base text-ink-2">Reliability</span>
          <Button variant="quiet" className="ml-auto" onClick={() => void refresh()} loading={loading}>
            <RefreshCw className="size-4" aria-hidden /> Refresh
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-12 px-5 py-10">
        {actionError && <p role="alert" className="rounded-[var(--radius-control)] bg-due-soft px-4 py-3 text-due">{actionError}</p>}

        {/* Overview */}
        <section aria-labelledby="ov-title">
          <h1 id="ov-title" className="font-display text-3xl">How reliable is the pipeline?</h1>
          <p className="mt-2 max-w-3xl text-base text-ink-2">
            Two kinds of run. <strong className="text-ink">Checks</strong> test KagazBol&rsquo;s own verification code against labelled documents, with planted errors — free and deterministic, no AI calls. <strong className="text-ink">Live</strong> runs the real Sarvam pipeline on the same documents and scores it.
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-rule bg-rule sm:grid-cols-5">
            {[
              ["Runs", String(runs.length)],
              ["Seed dataset", `${data?.datasets.seed ?? 0} documents`],
              ["Completed", String(runs.filter((r) => r.status === "completed").length)],
              ["Failed or interrupted", String(runs.filter((r) => r.status === "failed" || r.status === "interrupted").length)],
              ["Last run", runs[0] ? new Date(runs[0].createdAt).toLocaleString() : "Never"],
            ].map(([k, v]) => (
              <div key={k} className="bg-sheet p-4">
                <dt className="text-sm text-ink-2">{k}</dt>
                <dd className="mt-1 text-lg font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg" onClick={() => start("checks")} disabled={data?.running}>
              <FlaskConical className="size-5" aria-hidden /> Run checks
            </Button>
            <Button size="lg" onClick={() => start("live")} disabled={data?.running || !data?.liveAvailable}>
              <Play className="size-5" aria-hidden /> Run live evaluation
            </Button>
            {data?.running && <span role="status" className="text-base font-semibold text-stamp">A run is in progress…</span>}
            {!data?.liveAvailable && <span className="text-sm text-ink-2">Live runs need SARVAM_API_KEY on the server.</span>}
            {data?.liveAvailable && <span className="text-sm text-ink-2">Live runs call paid APIs ({data.datasets.seed ?? 0} documents).</span>}
          </div>
        </section>

        {/* Mode switch + latest metrics */}
        <section aria-labelledby="m-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="m-title" className="font-display text-2xl">Latest {mode === "live" ? "live" : "checks"} run</h2>
            <div role="radiogroup" aria-label="Run type" className="inline-flex rounded-[var(--radius-control)] border border-rule-strong bg-sheet p-0.5">
              {(["checks", "live"] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={`min-h-10 rounded-[8px] px-4 text-sm font-semibold ${mode === m ? "bg-ink text-sheet" : "text-ink-2"}`}>
                  {m === "checks" ? "Checks" : "Live"}
                </button>
              ))}
            </div>
          </div>
          {!latest ? (
            <div className="sheet mt-5 p-6 text-base text-ink-2">
              No completed {mode} run yet. {mode === "checks" ? "Press “Run checks” — it takes a second and costs nothing." : data?.liveAvailable ? "Press “Run live evaluation” to measure the real pipeline." : "Live evaluation is unavailable until SARVAM_API_KEY is configured, or run `npm run eval -- --live --commit` locally and deploy."}
            </div>
          ) : (
            <>
              {latest.syntheticOnly && (
                <p className="mt-4 flex flex-wrap items-center gap-3 text-base text-ink-2">
                  <Stamp tone="muted">Synthetic data</Stamp>
                  All {latest.datasetSize} documents are made up. These numbers describe the pipeline on test documents, not real-user performance.
                </p>
              )}
              <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {TILES[mode].map((tile) => (
                  <div key={tile.key} className="sheet p-5">
                    <dt className="text-sm font-semibold text-ink-2">{tile.label}</dt>
                    <dd className={`mt-1 font-display text-3xl tabular-nums ${latest.metrics?.[tile.key] == null ? "text-ink-3 text-xl" : "text-ink"}`}>{tile.fmt(latest.metrics?.[tile.key] as number | null)}</dd>
                    <p className="mt-1 text-sm text-ink-3">{tile.hint}</p>
                  </div>
                ))}
                <div className="sheet p-5">
                  <dt className="text-sm font-semibold text-ink-2">Samples with no failures</dt>
                  <dd className="mt-1 font-display text-3xl tabular-nums">{pct(latest.metrics?.sampleSuccessRate)}</dd>
                  <p className="mt-1 text-sm text-ink-3">{latest.failedSamples} of {latest.datasetSize} had at least one failure.</p>
                </div>
                {mode === "live" && (
                  <div className="sheet p-5">
                    <dt className="text-sm font-semibold text-ink-2">Estimated cost</dt>
                    <dd className="mt-1 font-display text-2xl">{latest.metrics?.estimatedCost ? `${latest.metrics.estimatedCost.amount} ${latest.metrics.estimatedCost.currency}` : "Unavailable"}</dd>
                    <p className="mt-1 text-sm text-ink-3">{data?.pricingConfigured ? "From token usage × EVAL_PRICING_JSON." : "Set EVAL_PRICING_JSON with current Sarvam prices to estimate."}</p>
                  </div>
                )}
              </dl>

              <div className="mt-8 grid gap-8 lg:grid-cols-2">
                <div>
                  <h3 className="text-lg font-semibold">Trend: {TILES[mode].find((x) => x.key === trendKey)?.label}</h3>
                  {trendPoints.length >= 3 ? (
                    <div className="sheet mt-3 p-4"><TrendLine points={trendPoints} label={`${trendPoints.length} completed runs, oldest to newest`} format={(v) => pct(v)} /></div>
                  ) : (
                    <p className="mt-3 text-base text-ink-2">A trend appears after 3 completed {mode} runs ({trendPoints.length} so far).</p>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Failures by stage and category</h3>
                  {Object.keys(latest.failureCounts).length ? (
                    <div className="mt-3"><BarList label="Failure counts" items={Object.entries(latest.failureCounts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name: name.replace(":", " · ").replace(/_/g, " "), value }))} /></div>
                  ) : (
                    <p className="mt-3 text-base text-ink-2">No failures in this run.</p>
                  )}
                </div>
              </div>

              <div className="mt-8 grid gap-8 lg:grid-cols-2">
                {(["byCategory", "byLanguage"] as const).map((k) => (
                  <div key={k}>
                    <h3 className="text-lg font-semibold">{k === "byCategory" ? "By document type" : "By document language"}</h3>
                    <table className="mt-3 w-full text-left text-sm">
                      <thead><tr className="border-b-2 border-ink text-ink-2"><th className="py-2 pr-3 font-semibold">{k === "byCategory" ? "Type" : "Language"}</th><th className="px-2 py-2 font-semibold">Docs</th><th className="px-2 py-2 font-semibold">{mode === "live" ? "Answer acc." : "Catch rate"}</th><th className="px-2 py-2 font-semibold">No failures</th></tr></thead>
                      <tbody>
                        {Object.entries(latest[k]).map(([name, m]) => (
                          <tr key={name} className="border-b border-rule">
                            <td className="py-2 pr-3">{name.replace(/_/g, " ")}</td>
                            <td className="px-2 py-2 tabular-nums">{m.samples}</td>
                            <td className="px-2 py-2 tabular-nums">{pct(mode === "live" ? m.answerAccuracy : m.checkerRecall)}</td>
                            <td className="px-2 py-2 tabular-nums">{pct(m.sampleSuccessRate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* All runs + comparison */}
        <section aria-labelledby="runs-title">
          <h2 id="runs-title" className="font-display text-2xl">All runs</h2>
          {runs.length === 0 ? (
            <p className="mt-3 text-base text-ink-2">No runs yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead><tr className="border-b-2 border-ink text-ink-2"><th className="py-2 pr-3 font-semibold">Started</th><th className="px-2 font-semibold">Type</th><th className="px-2 font-semibold">Status</th><th className="px-2 font-semibold">Docs</th><th className="px-2 font-semibold">Failed docs</th><th className="px-2 font-semibold"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className="border-b border-rule">
                      <td className="py-2.5 pr-3">{new Date(r.createdAt).toLocaleString()}</td>
                      <td className="px-2">{r.mode}</td>
                      <td className="px-2">{r.status === "running" ? `running ${r.progress.done}/${r.progress.total}` : r.status}</td>
                      <td className="px-2 tabular-nums">{r.datasetSize}</td>
                      <td className="px-2 tabular-nums">{r.status === "completed" ? r.failedSamples : "–"}</td>
                      <td className="px-2 text-right"><button type="button" onClick={() => openRun(r.id)} className="min-h-9 font-semibold text-stamp underline-offset-4 hover:underline">Details</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <form onSubmit={runCompare} className="sheet mt-8 grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <h3 className="text-lg font-semibold sm:col-span-3">Compare two runs</h3>
            {(["base", "candidate"] as const).map((k) => (
              <label key={k} className="block text-sm font-semibold">
                {k === "base" ? "Before" : "After"}
                <select value={compare[k]} onChange={(e) => setCompare((c) => ({ ...c, [k]: e.target.value }))} className="mt-1.5 min-h-11 w-full rounded-[var(--radius-control)] border border-rule-strong bg-sheet-2 px-2 text-base font-normal">
                  <option value="">Choose a run</option>
                  {runs.filter((r) => r.status === "completed").map((r) => <option key={r.id} value={r.id}>{r.mode} · {new Date(r.createdAt).toLocaleString()}</option>)}
                </select>
              </label>
            ))}
            <Button type="submit" variant="primary" size="lg" disabled={!compare.base || !compare.candidate || compare.base === compare.candidate}>Compare</Button>
          </form>

          {comparison && (
            <div className="mt-5">
              <p className="text-lg">
                Verdict: <strong>{comparison.verdict.replace("_", " ")}</strong>
                {comparison.reason && <span className="text-ink-2"> — {comparison.reason}</span>}
              </p>
              <p className="mt-1 text-sm text-ink-2">“Improved” requires no metric to regress and no new failing documents. Changes smaller than each metric&rsquo;s threshold count as unchanged.</p>
              {comparison.comparable && (
                <table className="mt-4 w-full text-left text-sm">
                  <thead><tr className="border-b-2 border-ink text-ink-2"><th className="py-2 pr-3 font-semibold">Metric</th><th className="px-2 font-semibold">Before</th><th className="px-2 font-semibold">After</th><th className="px-2 font-semibold">Change</th></tr></thead>
                  <tbody>
                    {comparison.metrics.filter((m) => m.before != null || m.after != null).map((m) => (
                      <tr key={m.metric} className="border-b border-rule">
                        <td className="py-2 pr-3">{m.label}</td>
                        <td className="px-2 tabular-nums">{m.before == null ? "–" : m.metric.startsWith("latency") ? ms(m.before) : m.metric.startsWith("ocr") ? dec(m.before) : pct(m.before)}</td>
                        <td className="px-2 tabular-nums">{m.after == null ? "–" : m.metric.startsWith("latency") ? ms(m.after) : m.metric.startsWith("ocr") ? dec(m.after) : pct(m.after)}</td>
                        <td className={`px-2 font-semibold ${m.change === "regressed" ? "text-due" : m.change === "improved" ? "text-ok" : "text-ink-2"}`}>{m.change.replace("_", " ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {comparison.newlyFailing.length > 0 && <p className="mt-3 text-base text-due">Newly failing: {comparison.newlyFailing.join(", ")}</p>}
              {comparison.newlyPassing.length > 0 && <p className="mt-1 text-base text-ok">Newly passing: {comparison.newlyPassing.join(", ")}</p>}
            </div>
          )}
        </section>

        {selected && (
          <section id="run-detail" aria-labelledby="detail-title" className="scroll-mt-6">
            <h2 id="detail-title" className="font-display text-2xl">Run details</h2>
            <p className="mt-1 text-sm text-ink-2">{selected.mode} · {selected.datasetId} · {new Date(selected.createdAt).toLocaleString()} · pipeline: {Object.entries(selected.pipeline).map(([k, v]) => `${k}=${v}`).join(", ") || "–"}</p>
            {selected.error && <p className="mt-3 text-due">{selected.error}</p>}
            <div className="mt-5 space-y-3">
              {selected.samples.map((s) => (
                <details key={s.sampleId} className="sheet group p-4" open={!s.ok && selected.samples.length <= 6}>
                  <summary className="flex min-h-9 cursor-pointer list-none flex-wrap items-center gap-3">
                    <span className="font-semibold">{s.sampleId}</span>
                    <span className="text-sm text-ink-2">{s.category.replace(/_/g, " ")} · {s.language}{s.synthetic ? " · synthetic" : ""}</span>
                    <span className="ml-auto">{s.ok ? <Stamp>Passed</Stamp> : <Stamp tone="due">{s.failures.length} failure{s.failures.length === 1 ? "" : "s"}</Stamp>}</span>
                  </summary>
                  {s.failures.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[36rem] text-left text-sm">
                        <thead><tr className="border-b border-ink text-ink-2"><th className="py-1.5 pr-2 font-semibold">Stage</th><th className="px-2 font-semibold">Category</th><th className="px-2 font-semibold">Expected</th><th className="px-2 font-semibold">Actual</th><th className="px-2 font-semibold">Debugging</th></tr></thead>
                        <tbody>
                          {s.failures.map((f, i) => (
                            <tr key={i} className="border-b border-rule align-top">
                              <td className="py-2 pr-2">{f.stage}</td>
                              <td className="px-2">{f.category.replace(/_/g, " ")}</td>
                              <td className="px-2">{f.expected}</td>
                              <td className="px-2">{f.actual}</td>
                              <td className="px-2 text-ink-2">{f.detail}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="mt-3 text-xs text-ink-3">
                    {Object.entries(s.metrics).filter(([, v]) => v != null).map(([k, v]) => `${k}: ${typeof v === "number" ? (v <= 1 ? v.toFixed(3) : v) : v}`).join(" · ")}
                    {Object.keys(s.latencyMs).length ? ` · latency ${Object.entries(s.latencyMs).map(([k, v]) => `${k} ${v} ms`).join(", ")}` : ""}
                  </p>
                </details>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
