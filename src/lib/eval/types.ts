import type { FieldType } from "./metrics";

/** One labelled evaluation sample. See eval/README.md for the format. */
export interface EvalSample {
  id: string;
  /** Synthetic samples are never reported as real-user performance. */
  synthetic: boolean;
  category: string;
  sourceLanguage: string;
  /** Repo-relative path to the document image, or null for text-only samples. */
  image: string | null;
  /** Ground-truth text of the document, in reading order. */
  referenceOcr: string;
  expected: {
    documentType: string;
    amounts: { label: string; value: string }[];
    dates: { label: string; value: string }[];
    deadline: string | null;
    fields: { name: string; type: FieldType; value: string }[];
  };
  qa: { question: string; answer: string; answerType: "amount" | "date" | "text"; evidence: string[] }[];
  notes?: string;
}

export type EvalMode = "checks" | "live";

export type EvalStage = "load" | "ocr" | "detection" | "extraction" | "evidence" | "qa" | "checker";

export type FailureCategory =
  | "provider_error"
  | "timeout"
  | "wrong_value"
  | "missing_value"
  | "evidence_not_found"
  | "false_evidence"
  | "unsupported_claim"
  | "language_mismatch"
  | "high_error_rate"
  | "checker_miss";

export interface SampleFailure {
  stage: EvalStage;
  category: FailureCategory;
  expected: string;
  actual: string;
  /** Debugging hint. Never contains secrets or full document text. */
  detail: string;
}

export interface SampleResult {
  sampleId: string;
  category: string;
  language: string;
  synthetic: boolean;
  ok: boolean;
  latencyMs: Record<string, number>;
  metrics: Record<string, number | null>;
  failures: SampleFailure[];
}

/** Aggregates; `null` means "not measured in this run" — the UI shows "Not measured". */
export interface RunMetrics {
  ocrCer: number | null;
  ocrWer: number | null;
  languageAccuracy: number | null;
  extractionAccuracy: number | null;
  numericAccuracy: number | null;
  evidenceCoverage: number | null;
  answerAccuracy: number | null;
  faithfulness: number | null;
  /** Checks mode: share of labelled evidence quotes/values the locator found. */
  locatorRecall: number | null;
  /** Checks mode: equivalent formats of the same amount/date recognised as equal. */
  normalizationAccuracy: number | null;
  /** Checks mode: share of planted wrong values the checker caught. */
  checkerRecall: number | null;
  /** Checks mode: share of correct values the checker wrongly rejected. */
  checkerFalseAlarm: number | null;
  sampleSuccessRate: number;
  latencyP50Ms: number | null;
  latencyP95Ms: number | null;
  /** Null when usage or pricing is unavailable. Never estimated without data. */
  estimatedCost: { amount: number; currency: string } | null;
}

export type RunStatus = "queued" | "running" | "completed" | "failed" | "interrupted";

export interface EvalRun {
  id: string;
  mode: EvalMode;
  status: RunStatus;
  datasetId: string;
  datasetSize: number;
  syntheticOnly: boolean;
  createdAt: string;
  finishedAt: string | null;
  progress: { done: number; total: number };
  metrics: RunMetrics | null;
  byCategory: Record<string, Partial<RunMetrics> & { samples: number }>;
  byLanguage: Record<string, Partial<RunMetrics> & { samples: number }>;
  failureCounts: Record<string, number>;
  samples: SampleResult[];
  /** Provider/model identifiers used, for comparing pipelines. */
  pipeline: Record<string, string>;
  error: string | null;
}
