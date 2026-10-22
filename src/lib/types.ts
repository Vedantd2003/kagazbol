import type { AppLanguage } from "./languages";
import type { EvidenceSpan, Verification } from "./evidence";
import type { QualityIssue } from "./quality";

export type { EvidenceSpan, Verification } from "./evidence";

export interface DocumentSummary {
  document_type: string;
  title: string;
  key_facts: string[];
  amounts: { label: string; value: string }[];
  dates: { label: string; value: string }[];
  deadline: string | null;
  action_required: string;
  /** Warnings/penalties/safety instructions stated in the document. */
  warnings: string[];
  summary_spoken: string;
}

/** Server-side check of each extracted value against the document text. */
export interface FieldCheck {
  field: "amount" | "date" | "deadline";
  index: number;
  value: string;
  found: boolean;
  evidence: EvidenceSpan | null;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ParseStartResponse {
  jobId: string;
}

export type ParseJobState = "Accepted" | "Pending" | "Running" | "Completed" | "PartiallyCompleted" | "Failed";

export interface ParseStatusResponse {
  state: ParseJobState;
  errorMessage?: string;
}

export interface ParseResultResponse {
  ocrText: string;
  /** Problems with the extracted text, e.g. near-empty output (codes for localised hints). */
  qualityIssues: QualityIssue[];
  /** Same problems as English sentences (for older clients/scripts). */
  qualityWarnings: string[];
}

export interface SummarizeRequest {
  ocrText: string;
  language: AppLanguage;
}

export interface SummarizeResponse {
  summary: DocumentSummary;
  checks: FieldCheck[];
  /** True when the model output could not be parsed and a minimal fallback was used. */
  fallback: boolean;
  latencyMs: number;
  model: string;
}

export interface ChatRequest {
  ocrText: string;
  summary: DocumentSummary;
  language: AppLanguage;
  history: ChatTurn[];
  question: string;
}

export interface ChatResponse {
  answer: string;
  verification: Verification;
  evidence: EvidenceSpan[];
  unsupportedValues: string[];
  latencyMs: number;
  model: string;
}

export interface DetectLanguageResponse {
  languageCode: string | null;
  scriptCode: string | null;
  /** Whether KagazBol can explain in this language. */
  explainable: boolean;
}

export interface ExplainResponse {
  simple: string;
  example: string | null;
  unclear: boolean;
  language: AppLanguage;
}

export interface SttResponse {
  transcript: string;
  languageCode: string | null;
  /** 0–1, only returned by the provider when the language was auto-detected. */
  languageProbability: number | null;
}
