"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  PollingTimeoutError,
  detectDocumentLanguage,
  getParseResult,
  startParse,
  summarizeDocument,
  waitForParseCompletion,
} from "@/lib/apiClient";
import { compressImage } from "@/lib/compressImage";
import { assessImageFile } from "@/lib/imageQuality";
import type { QualityIssue } from "@/lib/quality";
import type { AppLanguage } from "@/lib/languages";
import type { DetectLanguageResponse, DocumentSummary, FieldCheck } from "@/lib/types";
import type { UiStrings } from "@/lib/i18n";

export type Stage = "idle" | "checking" | "quality_warning" | "preparing" | "uploading" | "reading" | "understanding" | "ready" | "error";

export interface SummaryEntry {
  summary: DocumentSummary;
  checks: FieldCheck[];
  fallback: boolean;
}

export interface PipelineError {
  kind: "timeout" | "network" | "read_failed" | "invalid_file" | "rate_limited" | "generic";
  serverMessage: string | null;
  /** Where "Try again" restarts: OCR results are kept so a summary retry never re-uploads. */
  retryFrom: "upload" | "summarize";
}

export interface DocState {
  stage: Stage;
  docId: number;
  fileName: string | null;
  previewUrl: string | null;
  uploadPct: number | null;
  imageIssues: QualityIssue[];
  ocrText: string | null;
  qualityIssues: QualityIssue[];
  detected: DetectLanguageResponse | null;
  summaries: Partial<Record<AppLanguage, SummaryEntry>>;
  resummarizing: AppLanguage | null;
  error: PipelineError | null;
}

const INITIAL: DocState = {
  stage: "idle",
  docId: 0,
  fileName: null,
  previewUrl: null,
  uploadPct: null,
  imageIssues: [],
  ocrText: null,
  qualityIssues: [],
  detected: null,
  summaries: {},
  resummarizing: null,
  error: null,
};

function classify(err: unknown): Omit<PipelineError, "retryFrom"> {
  if (err instanceof PollingTimeoutError) return { kind: "timeout", serverMessage: null };
  if (err instanceof ApiError) {
    if (err.code === "NETWORK") return { kind: "network", serverMessage: null };
    if (err.code === "UNSUPPORTED_FILE" || err.code === "FILE_TOO_LARGE" || err.code === "INVALID_DOCUMENT") return { kind: "invalid_file", serverMessage: err.message };
    if (err.code === "LOW_QUALITY" || err.code === "OCR_FAILED") return { kind: "read_failed", serverMessage: err.message };
    if (err.code === "RATE_LIMITED") return { kind: "rate_limited", serverMessage: err.message };
    if (err.code === "PROVIDER_TIMEOUT") return { kind: "timeout", serverMessage: null };
    return { kind: "generic", serverMessage: err.message };
  }
  if (err instanceof Error && /Document processing failed/.test(err.message)) return { kind: "read_failed", serverMessage: null };
  return { kind: "generic", serverMessage: null };
}

export function errorMessage(e: PipelineError, t: UiStrings, language: AppLanguage): string {
  switch (e.kind) {
    case "timeout":
      return t.errorTimeout;
    case "network":
      return t.errorNetwork;
    case "read_failed":
      return t.errorReadFailed;
    case "invalid_file":
      return language === "en-IN" && e.serverMessage ? e.serverMessage : t.unsupportedFile;
    default:
      // Server messages are English; show them only in the English UI.
      return language === "en-IN" && e.serverMessage ? e.serverMessage : t.errorGeneric;
  }
}

const isAbort = (err: unknown) => err instanceof DOMException && err.name === "AbortError";

/**
 * The document workflow as one state object: quality check → upload → OCR →
 * language detection (optional) → explanation. Each stage only advances after the
 * server confirms success; optional stages never fail the document.
 */
export function useDocumentPipeline() {
  const [state, setState] = useState<DocState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<File | null>(null);
  const docIdRef = useRef(0);
  const ocrRef = useRef<string | null>(null);
  // Latest state for decisions made inside callbacks (state updaters may run lazily).
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    const url = state.previewUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [state.previewUrl]);

  const summarize = useCallback(async (docId: number, text: string, language: AppLanguage, signal: AbortSignal) => {
    const res = await summarizeDocument(text, language, signal);
    if (docIdRef.current !== docId) return null;
    const entry: SummaryEntry = { summary: res.summary, checks: res.checks ?? [], fallback: !!res.fallback };
    setState((s) => ({ ...s, summaries: { ...s.summaries, [language]: entry } }));
    return entry;
  }, []);

  const runFromUpload = useCallback(
    async (file: File, language: AppLanguage) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const docId = docIdRef.current;
      const guard = () => docIdRef.current === docId && !ac.signal.aborted;
      try {
        setState((s) => ({ ...s, stage: "preparing", error: null, uploadPct: null }));
        const compressed = await compressImage(file);
        if (!guard()) return;
        setState((s) => ({ ...s, stage: "uploading", uploadPct: 0 }));
        const { jobId } = await startParse(compressed, language, {
          signal: ac.signal,
          onProgress: (pct) => guard() && setState((s) => ({ ...s, uploadPct: pct })),
        });
        if (!guard()) return;
        setState((s) => ({ ...s, stage: "reading", uploadPct: null }));
        await waitForParseCompletion(jobId, { signal: ac.signal });
        const result = await getParseResult(jobId, ac.signal);
        if (!guard()) return;
        ocrRef.current = result.ocrText;
        setState((s) => ({ ...s, ocrText: result.ocrText, qualityIssues: result.qualityIssues ?? [], stage: "understanding" }));

        // Optional: language detection runs alongside the explanation and never blocks it.
        void detectDocumentLanguage(result.ocrText, ac.signal)
          .then((d) => guard() && setState((s) => ({ ...s, detected: d })))
          .catch(() => undefined);

        await summarize(docId, result.ocrText, language, ac.signal);
        if (!guard()) return;
        setState((s) => ({ ...s, stage: "ready" }));
      } catch (err) {
        if (isAbort(err) || !guard()) return;
        setState((s) => ({ ...s, stage: "error", uploadPct: null, error: { ...classify(err), retryFrom: ocrRef.current ? "summarize" : "upload" } }));
      }
    },
    [summarize]
  );

  const selectFile = useCallback(
    async (file: File, language: AppLanguage, opts: { skipQualityCheck?: boolean } = {}) => {
      abortRef.current?.abort();
      const docId = ++docIdRef.current;
      fileRef.current = file;
      ocrRef.current = null;
      setState({ ...INITIAL, docId, stage: "checking", fileName: file.name, previewUrl: URL.createObjectURL(file) });
      if (!opts.skipQualityCheck) {
        const report = await assessImageFile(file);
        if (docIdRef.current !== docId) return;
        if (!report.ok) {
          setState((s) => ({ ...s, stage: "quality_warning", imageIssues: report.issues }));
          return;
        }
      }
      void runFromUpload(file, language);
    },
    [runFromUpload]
  );

  const continueAnyway = useCallback(
    (language: AppLanguage) => {
      if (fileRef.current) void runFromUpload(fileRef.current, language);
    },
    [runFromUpload]
  );

  const retry = useCallback(
    async (language: AppLanguage) => {
      const text = ocrRef.current;
      if (!text) {
        if (fileRef.current) void runFromUpload(fileRef.current, language);
        return;
      }
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const docId = docIdRef.current;
      setState((s) => ({ ...s, stage: "understanding", error: null }));
      try {
        await summarize(docId, text, language, ac.signal);
        if (docIdRef.current === docId) setState((s) => ({ ...s, stage: "ready" }));
      } catch (err) {
        if (isAbort(err) || docIdRef.current !== docId) return;
        setState((s) => ({ ...s, stage: "error", error: { ...classify(err), retryFrom: "summarize" } }));
      }
    },
    [runFromUpload, summarize]
  );

  /** Makes sure an explanation exists in `language`; cached per language so switching back is free. */
  const ensureLanguage = useCallback(
    async (language: AppLanguage) => {
      const text = ocrRef.current;
      if (!text) return;
      const current = stateRef.current;
      if (current.stage !== "ready" || current.summaries[language] || current.resummarizing === language) return;
      setState((s) => ({ ...s, resummarizing: language }));
      const ac = new AbortController();
      const docId = docIdRef.current;
      try {
        await summarize(docId, text, language, ac.signal);
      } catch {
        // The previous language's explanation stays visible; the UI shows a notice.
      } finally {
        if (docIdRef.current === docId) setState((s) => (s.resummarizing === language ? { ...s, resummarizing: null } : s));
      }
    },
    [summarize]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    docIdRef.current++;
    fileRef.current = null;
    ocrRef.current = null;
    setState(INITIAL);
  }, []);

  return { state, selectFile, continueAnyway, retry, ensureLanguage, cancel, reset: cancel };
}
